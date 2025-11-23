/**
 * Response type for /api/list-info endpoint
 */
export interface ListInfoResponse {
	/** List name */
	name: string;
	/** List description */
	description: string;
	/** List purpose: 'app.bsky.graph.defs#curatelist' or 'app.bsky.graph.defs#modlist' */
	purpose: string;
	/** Creator's DID */
	creatorDid: string;
	/** Creator's handle (e.g., 'example.bsky.social') */
	creatorHandle: string;
	/** Number of items in the list */
	listItemCount: number;
	/** Date when the last item was added (ISO 8601 format) or null if no items */
	dateLastAdded: string | null;
	/** Record key (rkey) extracted from the AT URI */
	rkey: string;
}

/**
 * Request body for /api/list-info endpoint
 */
export interface ListInfoRequest {
	/** AT URI of the list (e.g., 'at://did:plc:xxxxx/app.bsky.graph.list/xxxxx') */
	uri: string;
}

/**
 * Error response from the API
 */
export interface ErrorResponse {
	error: string;
	message: string;
}
