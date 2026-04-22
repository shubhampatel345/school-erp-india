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
     * / Batch upsert array of JSON records. Returns count upserted.
     */
    batchUpsert(collection: string, recordsJson: Array<string>): Promise<bigint>;
    /**
     * / Create a new record. Returns "ok".
     */
    createRecord(collection: string, recordJson: string): Promise<string>;
    /**
     * / Delete a record by id. Returns "ok" or "not_found".
     */
    deleteRecord(collection: string, id: string): Promise<string>;
    /**
     * / Fetch all collections in one shot (WhatsApp-style initial load).
     */
    fetchAll(): Promise<string>;
    /**
     * / Return recent changelog entries as JSON array (last 100)
     */
    getChangelog(): Promise<string>;
    /**
     * / Return record counts for all collections (for dashboard stats)
     */
    getCounts(): Promise<string>;
    /**
     * / Return a single record by id (JSON string or empty string if not found)
     */
    getRecord(collection: string, id: string): Promise<string>;
    /**
     * / Return all records in a collection as a JSON array string
     */
    listRecords(collection: string): Promise<string>;
    ping(): Promise<string>;
    /**
     * / Replace entire collection with new records. Returns count.
     */
    replaceCollection(collection: string, recordsJson: Array<string>): Promise<bigint>;
    /**
     * / Update an existing record by id. Returns "ok" or "not_found".
     */
    updateRecord(collection: string, id: string, recordJson: string): Promise<string>;
    /**
     * / Upsert a record: update if id exists, create otherwise. Returns "ok".
     */
    upsertRecord(collection: string, id: string, recordJson: string): Promise<string>;
}
