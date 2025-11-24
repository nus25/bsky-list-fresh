import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import worker,{parseListIdentifier} from '../src';
import type { ListInfoRequest, ListInfoResponse, ErrorResponse } from '../src/types';

// Create shared mock functions
const mockGetProfile = vi.fn();
const mockGetList = vi.fn();
const mockGetRecord = vi.fn();

// Mock @atproto/api module
vi.mock('@atproto/api', () => {
	return {
		AtpAgent: vi.fn().mockImplementation(() => ({
			app: {
				bsky: {
					actor: {
						getProfile: mockGetProfile,
					},
					graph: {
						getList: mockGetList,
					},
				},
			},
			com: {
				atproto: {
					repo: {
						getRecord: mockGetRecord,
					},
				},
			},
		})),
	};
});

describe('Bsky List Fresh Worker', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('POST /api/list-info', () => {
		it('returns list info with items (AT URI with DID)', async () => {
			mockGetList.mockResolvedValue({
				data: {
					list: {
						creator: {
							did: 'did:plc:test123',
							handle: 'user.bsky.social',
						},
						name: 'Test List',
						description: 'A test list',
						purpose: 'app.bsky.graph.defs#curatelist',
						listItemCount: 5,
					},
					items: [
						{
							uri: 'at://did:plc:test123/app.bsky.graph.listitem/item123',
						},
					],
				},
			});

			mockGetRecord.mockResolvedValue({
				data: {
					value: {
						createdAt: '2025-11-24T10:00:00.000Z',
					},
				},
			});

			const request = new Request<unknown, IncomingRequestCfProperties>('http://example.com/api/list-info', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					uri: 'at://did:plc:test123/app.bsky.graph.list/list123',
				} as ListInfoRequest),
			});

			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
			expect(response.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
			expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
			expect(response.headers.get('Cache-Control')).toBe('private, no-cache');

			const data: ListInfoResponse = await response.json();
			expect(data).toEqual({
				name: 'Test List',
				description: 'A test list',
				purpose: 'app.bsky.graph.defs#curatelist',
				creatorDid: 'did:plc:test123',
				creatorHandle: 'user.bsky.social',
				listItemCount: 5,
				dateLastAdded: '2025-11-24T10:00:00.000Z',
				rkey: 'list123',
			});
		});

		it('returns list info with handle resolution', async () => {
			mockGetProfile.mockResolvedValue({
				data: {
					did: 'did:plc:resolved456',
					handle: 'user.bsky.social',
				},
			});

			mockGetList.mockResolvedValue({
				data: {
					list: {
						creator: {
							did: 'did:plc:resolved456',
							handle: 'user.bsky.social',
						},
						name: 'Handle List',
						description: 'List via handle',
						purpose: 'app.bsky.graph.defs#modlist',
						listItemCount: 3,
					},
					items: [
						{
							uri: 'at://did:plc:resolved456/app.bsky.graph.listitem/item789',
						},
					],
				},
			});

			mockGetRecord.mockResolvedValue({
				data: {
					value: {
						createdAt: '2025-11-20T15:30:00.000Z',
					},
				},
			});

			const request = new Request<unknown, IncomingRequestCfProperties>('http://example.com/api/list-info', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					uri: 'at://user.bsky.social/app.bsky.graph.list/list456',
				} as ListInfoRequest),
			});

			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
			expect(mockGetProfile).toHaveBeenCalledWith({
				actor: 'user.bsky.social',
			});

			const data: ListInfoResponse = await response.json();
			expect(data.creatorDid).toBe('did:plc:resolved456');
			expect(data.creatorHandle).toBe('user.bsky.social');
			expect(data.dateLastAdded).toBe('2025-11-20T15:30:00.000Z');
		});

		it('returns list info with empty list (no items)', async () => {
			mockGetList.mockResolvedValue({
				data: {
					list: {
						creator: {
							did: 'did:plc:empty123',
							handle: 'empty.bsky.social',
						},
						name: 'Empty List',
						description: 'No items yet',
						purpose: 'app.bsky.graph.defs#curatelist',
						listItemCount: 0,
					},
					items: [],
				},
			});

			const request = new Request<unknown, IncomingRequestCfProperties>('http://example.com/api/list-info', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					uri: 'at://did:plc:empty123/app.bsky.graph.list/empty123',
				} as ListInfoRequest),
			});

			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);

			const data: ListInfoResponse = await response.json();
			expect(data.name).toBe('Empty List');
			expect(data.listItemCount).toBe(0);
			expect(data.dateLastAdded).toBeNull();
		});

		it('handles cursor case when first record is invalid', async () => {
			mockGetList.mockResolvedValue({
				data: {
					list: {
						creator: {
							did: 'did:plc:cursor123',
							handle: 'cursor.bsky.social',
						},
						name: 'Cursor List',
						description: 'First record invalid',
						purpose: 'app.bsky.graph.defs#curatelist',
						listItemCount: 2,
					},
					items: [],
					cursor: 'cursor789',
				},
			});

			mockGetRecord.mockResolvedValue({
				data: {
					value: {
						createdAt: '2025-11-18T12:00:00.000Z',
					},
				},
			});

			const request = new Request<unknown, IncomingRequestCfProperties>('http://example.com/api/list-info', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					uri: 'at://did:plc:cursor123/app.bsky.graph.list/cursor123',
				} as ListInfoRequest),
			});

			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
			expect(mockGetRecord).toHaveBeenCalledWith({
				repo: 'did:plc:cursor123',
				collection: 'app.bsky.graph.listitem',
				rkey: 'cursor789',
			});

			const data: ListInfoResponse = await response.json();
			expect(data.dateLastAdded).toBe('2025-11-18T12:00:00.000Z');
		});

		it('returns 400 when uri is missing', async () => {
			const request = new Request<unknown, IncomingRequestCfProperties>('http://example.com/api/list-info', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({}),
			});

			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(400);
			expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');

			const data: ErrorResponse = await response.json();
			expect(data.error).toBe('BAD_REQUEST');
			expect(data.message).toBe('Missing uri parameter');
		});

		it('returns 400 when uri has invalid format', async () => {
			const request = new Request<unknown, IncomingRequestCfProperties>('http://example.com/api/list-info', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					uri: 'invalid-uri-format',
				} as ListInfoRequest),
			});

			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(400);

			const data: ErrorResponse = await response.json();
			expect(data.error).toBe('BAD_REQUEST');
			expect(data.message).toContain('Invalid URI format');
		});

		it('returns 400 when uri has wrong collection', async () => {
			const request = new Request<unknown, IncomingRequestCfProperties>('http://example.com/api/list-info', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					uri: 'at://did:plc:test123/app.bsky.feed.post/wrongcollection',
				} as ListInfoRequest),
			});

			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			expect(response.status).toBe(400);

			const data: ErrorResponse = await response.json();
			expect(data.error).toBe('BAD_REQUEST');
			expect(data.message).toContain('Invalid collection in URI');
		});

		it('returns 404 when list is not found', async () => {
			mockGetList.mockRejectedValue(new Error('List not found'));

			const request = new Request<unknown, IncomingRequestCfProperties>('http://example.com/api/list-info', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					uri: 'at://did:plc:notfound/app.bsky.graph.list/notfound',
				} as ListInfoRequest),
			});

			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(404);

			const data: ErrorResponse = await response.json();
			expect(data.error).toBe('INTERNAL_ERROR');
			expect(data.message).toBe('LIST_NOT_FOUND');
		});

		it('returns 404 when handle resolution fails', async () => {
			mockGetProfile.mockRejectedValue(new Error('Profile not found'));

			const request = new Request<unknown, IncomingRequestCfProperties>('http://example.com/api/list-info', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					uri: 'at://nonexistent.bsky.social/app.bsky.graph.list/list123',
				} as ListInfoRequest),
			});

			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(404);

			const data: ErrorResponse = await response.json();
			expect(data.message).toBe('LIST_NOT_FOUND');
		});

		it('returns 500 when getList throws unexpected error', async () => {
			mockGetList.mockRejectedValue(new Error('Network error'));

			const request = new Request<unknown, IncomingRequestCfProperties>('http://example.com/api/list-info', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					uri: 'at://did:plc:test123/app.bsky.graph.list/list123',
				} as ListInfoRequest),
			});

			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(500);

			const data: ErrorResponse = await response.json();
			expect(data.error).toBe('INTERNAL_ERROR');
			expect(data.message).toContain('Failed to fetch list information');
		});
	});

	describe('Other routes', () => {
		it('returns 404 for GET requests', async () => {
			const request = new Request<unknown, IncomingRequestCfProperties>('http://example.com/some-path', {
				method: 'GET',
			});

			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(404);
			expect(await response.text()).toBe('Not Found');
		});

		it('returns 404 for root path', async () => {
			const request = new Request<unknown, IncomingRequestCfProperties>('http://example.com/', {
				method: 'GET',
			});

			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(404);
		});

		it('returns 404 for non-POST methods on /api/list-info', async () => {
			const request = new Request<unknown, IncomingRequestCfProperties>('http://example.com/api/list-info', {
				method: 'GET',
			});

			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(404);
		});
	});
});

describe('parseListIdentifier', () => {
	it('successfully parses valid AT URI with DID', () => {
		const result = parseListIdentifier('at://did:plc:test123/app.bsky.graph.list/list123');

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.atUri.hostname).toBe('did:plc:test123');
			expect(result.atUri.collection).toBe('app.bsky.graph.list');
			expect(result.atUri.rkey).toBe('list123');
		}
	});

	it('successfully parses valid AT URI with handle', () => {
		const result = parseListIdentifier('at://user.bsky.social/app.bsky.graph.list/abc123');

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.atUri.hostname).toBe('user.bsky.social');
			expect(result.atUri.rkey).toBe('abc123');
		}
	});

	it('returns error for invalid URI format', () => {
		const result = parseListIdentifier('invalid-uri');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('Invalid URI format');
		}
	});

	it('returns error for wrong collection', () => {
		const result = parseListIdentifier('at://did:plc:test/app.bsky.feed.post/post123');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('Invalid collection in URI');
		}
	});

	it('returns error for missing protocol', () => {
		const result = parseListIdentifier('did:plc:test/app.bsky.graph.list/list123');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('Invalid URI format');
		}
	});

	it('returns error for empty string', () => {
		const result = parseListIdentifier('');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('Invalid URI format');
		}
	});
});