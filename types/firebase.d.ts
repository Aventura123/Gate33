declare module 'firebase/firestore' {
  export interface DocumentData {
    [field: string]: any;
  }

  export interface QueryDocumentSnapshot {
    id: string;
    data(): DocumentData;
  }

  export interface QuerySnapshot {
    docs: QueryDocumentSnapshot[];
    empty: boolean;
    size: number;
  }

  export function collection(firestore: any, collectionPath: string): any;
  export function query(collectionRef: any, ...queryConstraints: any[]): any;
  export function where(fieldPath: string, opStr: string, value: any): any;
  export function getDocs(query: any): Promise<QuerySnapshot>;
}