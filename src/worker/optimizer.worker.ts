import { OptimizerHost } from "./optimizerHost.ts";
import type { WorkerRequest, WorkerResponse } from "./protocol.ts";

const scope = self as unknown as DedicatedWorkerGlobalScope;
const host = new OptimizerHost((message: WorkerResponse) => scope.postMessage(message));
scope.onmessage = (event: MessageEvent<WorkerRequest>) => void host.handle(event.data);
