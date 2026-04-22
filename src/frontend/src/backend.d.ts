import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface backendInterface {
    /**
     * / Upsert a batch of records (insert or overwrite by id).
     */
    batchUpsert(collection: string, records: Array<{
        id: string;
        data: string;
    }>): Promise<{
        ok: boolean;
        err: string;
        count: bigint;
    }>;
    /**
     * / Create a new record. Fails if the id already exists.
     */
    createRecord(collection: string, id: string, data: string): Promise<{
        ok: boolean;
        err: string;
    }>;
    /**
     * / Delete an entire collection. Returns number of records removed.
     */
    deleteCollection(collection: string): Promise<{
        ok: boolean;
        count: bigint;
    }>;
    /**
     * / Delete a record by id.
     */
    deleteRecord(collection: string, id: string): Promise<{
        ok: boolean;
        err: string;
    }>;
    /**
     * / Export all data for backup. Returns array of (collection, [(id, data)]).
     */
    exportAll(): Promise<Array<[string, Array<[string, string]>]>>;
    /**
     * / Return changelog entries since a given timestamp (nanoseconds).
     * / Pass 0 to get all entries.
     */
    getChangelog(since: bigint): Promise<Array<string>>;
    /**
     * / Return count per collection.
     */
    getCounts(): Promise<Array<[string, bigint]>>;
    /**
     * / Get a single record by id. Returns null if not found.
     */
    getRecord(collection: string, id: string): Promise<string | null>;
    /**
     * / Import all data from a backup. Merges (upserts) all records.
     */
    importAll(data: Array<[string, Array<[string, string]>]>): Promise<{
        ok: boolean;
        count: bigint;
    }>;
    /**
     * / List all records in a collection as an array of JSON strings.
     */
    listRecords(collection: string): Promise<Array<string>>;
    /**
     * / Paginated list. offset is 0-based.
     */
    listRecordsPaginated(collection: string, offset: bigint, limit: bigint): Promise<{
        total: bigint;
        records: Array<string>;
    }>;
    /**
     * / Health check.
     */
    ping(): Promise<string>;
    /**
     * / Update an existing record. Returns err if not found.
     */
    updateRecord(collection: string, id: string, data: string): Promise<{
        ok: boolean;
        err: string;
    }>;
}
