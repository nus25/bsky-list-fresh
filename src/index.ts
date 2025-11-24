/**
 * Bsky List Fresh - Worker
 * Retrieves Bluesky list information and last updated date
 */

import { AtpAgent } from '@atproto/api';
import type { ListInfoRequest, ListInfoResponse, ErrorResponse } from './types';
import { isValidHandle, ensureValidDid, AtUri, ensureValidAtUri } from '@atproto/syntax';

const ATPROTO_SERVICE = 'https://public.api.bsky.app';

/**
 * Debug logging helper
 */
function debugLog(env: Env, ...args: any[]): void {
	if (env.DEBUG === 'true') {
		console.log(...args);
	}
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: Response): Response {
	const headers = new Headers(response.headers);
	headers.set('X-Content-Type-Options', 'nosniff');

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

/**
 * Parse AT URI or handle: format to extract DID and rkey
 */
export function parseListIdentifier(uri: string): { success: true; atUri: AtUri } | { success: false; error: string } {
	let atUri: AtUri;
	try {
		ensureValidAtUri(uri);
		atUri = new AtUri(uri);
		if (atUri.collection !== 'app.bsky.graph.list') {
			console.error('Invalid collection in AT URI:', atUri.collection);
			return { success: false, error: 'Invalid collection in URI' };
		}
	} catch (error) {
		console.error('Error parsing AT URI:', error);
		return { success: false, error: 'Invalid URI format' };
	}
	return { success: true, atUri };
}

/**
 * Get list information from Bluesky
 */
async function getListInfo(uri: string, env: Env): Promise<ListInfoResponse> {
	const listCreator: { did: string; handle: string } = { did: '', handle: '' };
	const parsed = parseListIdentifier(uri);
	if (!parsed.success) {
		console.error('Failed to parse identifier:', uri);
		throw new Error(parsed.error);
	}
	const atUri = parsed.atUri;
	let host = atUri.hostname;
	let rkey = atUri.rkey;
	const agent = new AtpAgent({ service: ATPROTO_SERVICE });

	if (isValidHandle(host)) {
		debugLog(env, 'Resolving handle to DID:', host);
		try {
			const profile = await agent.app.bsky.actor.getProfile({ actor: host });
			listCreator.did = profile.data.did;
			listCreator.handle = profile.data.handle;
			debugLog(env, 'Resolved handle and DID:', listCreator.handle, listCreator.did);
		} catch (error) {
			console.error('Failed to resolve handle:', host, error);
			throw new Error('LIST_NOT_FOUND');
		}
	} else {
		ensureValidDid(host);
		listCreator.did = host;
	}

	try {
		// Get list with latest item using app.bsky.graph.getList
		const listAtUri = AtUri.make(listCreator.did, 'app.bsky.graph.list', rkey).toString();
		debugLog(env, 'Fetching list with items:', listAtUri);
		let dateLastAdded: string | null = null;
		const listData = { name: '', description: '', purpose: '', itemCount: 0 }; // Placeholder for list data
		try {
			const getListResponse = await agent.app.bsky.graph.getList({
				list: listAtUri,
				limit: 1,
			});

			debugLog(env, 'GetList response:', getListResponse.data);

			listCreator.did = getListResponse.data.list.creator.did;
			listCreator.handle = getListResponse.data.list.creator.handle;
			listData.name = getListResponse.data.list.name || '';
			listData.description = getListResponse.data.list.description || '';
			listData.purpose = getListResponse.data.list.purpose || '';
			listData.itemCount = getListResponse.data.list.listItemCount || 0;
			debugLog(env, 'List data:', listData);

			if (listData.itemCount === 0) {
				// No items in the list - set dateLastAdded to null
				dateLastAdded = null;
			} else if (getListResponse.data.items && getListResponse.data.items.length > 0) {
				// Get the latest item if available (case: first record is valid)
				const latestItemUri = getListResponse.data.items[0].uri;
				debugLog(env, 'Latest list item URI:', latestItemUri);
				const aturi = new AtUri(latestItemUri);

				// Get the list item record to get createdAt
				debugLog(env, 'Fetching list item record:', { did: aturi.hostname, rkey: aturi.rkey });
				const itemRecord = await agent.com.atproto.repo.getRecord({
					repo: aturi.hostname,
					collection: 'app.bsky.graph.listitem',
					rkey: aturi.rkey,
				});
				const itemData = itemRecord.data.value as any;
				dateLastAdded = itemData.createdAt;
				debugLog(env, 'List item createdAt:', dateLastAdded);
			} else if (getListResponse.data.items && getListResponse.data.items.length === 0 && getListResponse.data.cursor) {
				// itemCount > 0 but no items fetched(case: first record is invalid)

				// Get the latest record by getRecord
				const rkey = getListResponse.data.cursor;
				const itemRecord = await agent.com.atproto.repo.getRecord({
					repo: listCreator.did,
					collection: 'app.bsky.graph.listitem',
					rkey: rkey,
				});
				const itemData = itemRecord.data.value as any;
				dateLastAdded = itemData.createdAt;
				debugLog(env, 'List item createdAt:', dateLastAdded);
			} else {
				// shuld not reach here
				throw new Error('Unhandled error');
			}
		} catch (getListError: any) {
			console.error('Error fetching list:', getListError);
			// Check if it's a "List not found" error
			if (getListError?.message?.includes('List not found')) {
				throw new Error('LIST_NOT_FOUND');
			}
			throw new Error('Failed to fetch list information');
		}

		const response: ListInfoResponse = {
			name: listData.name || '',
			description: listData.description || '',
			purpose: listData.purpose || '',
			creatorDid: listCreator.did,
			creatorHandle: listCreator.handle,
			listItemCount: listData.itemCount,
			dateLastAdded: dateLastAdded,
			rkey: rkey,
		};

		debugLog(env, 'Successfully built response:', response);
		return response;
	} catch (error) {
		console.error('Error in getListInfo:', error);
		if (error instanceof Error) {
			console.error('Error details:', error.message, error.stack);
		}
		throw error;
	}
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);

		// Handle API endpoint
		if (url.pathname === '/api/list-info' && request.method === 'POST') {
			try {
				const body = (await request.json()) as ListInfoRequest;

				if (!body.uri) {
					const errorResponse: ErrorResponse = {
						error: 'BAD_REQUEST',
						message: 'Missing uri parameter',
					};
					return addSecurityHeaders(
						new Response(JSON.stringify(errorResponse), {
							status: 400,
							headers: {
								'Content-Type': 'application/json; charset=utf-8',
								'Cache-Control': 'private, no-cache',
							},
						})
					);
				}

				const listInfo = await getListInfo(body.uri, env);

				return addSecurityHeaders(
					new Response(JSON.stringify(listInfo), {
						status: 200,
						headers: {
							'Content-Type': 'application/json; charset=utf-8',
							'Cache-Control': 'private, no-cache',
						},
					})
				);
			} catch (error) {
				console.error('Error handling /api/list-info:', error);

				const errorMessage = error instanceof Error ? error.message : 'An error occurred while processing the request';

				// Determine status code based on error type
				let statusCode = 500;
				let errorType = 'INTERNAL_ERROR';

				if (error instanceof Error) {
					if (errorMessage === 'LIST_NOT_FOUND') {
						statusCode = 404;
					} else if (errorMessage === 'Invalid URI format' || errorMessage === 'Invalid collection in URI') {
						statusCode = 400;
						errorType = 'BAD_REQUEST';
					}
				}

				const errorResponse: ErrorResponse = {
					error: errorType,
					message: errorMessage,
				};

				return addSecurityHeaders(
					new Response(JSON.stringify(errorResponse), {
						status: statusCode,
						headers: {
							'Content-Type': 'application/json; charset=utf-8',
							'Cache-Control': 'private, no-cache',
						},
					})
				);
			}
		}

		// For all other routes, return 404 (static assets are handled by wrangler)
		return new Response('Not Found', { status: 404 });
	},
} satisfies ExportedHandler<Env>;
