export interface ISaga<T, R> {
  execute(data: T): Promise<R>;
  compensate(): Promise<void>;
}

export interface SagaStep {
  name: string;
  execute: () => Promise<any>;
  compensate: () => Promise<void>;
}
