import { WorkerManagerService } from './worker-manager.service';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';

jest.mock('node:child_process', () => ({
  spawn: jest.fn(),
}));

function createMockChild() {
  const child = new EventEmitter() as EventEmitter & { killed: boolean; kill: jest.Mock };
  child.killed = false;
  child.kill = jest.fn(() => {
    child.killed = true;
  });
  return child;
}

describe('WorkerManagerService', () => {
  const originalEmbedWorker = process.env.EMBED_WORKER;
  let service: WorkerManagerService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkerManagerService();
  });

  afterAll(() => {
    process.env.EMBED_WORKER = originalEmbedWorker;
  });

  it('ne lance pas le worker au autoStart() si EMBED_WORKER != "true"', () => {
    process.env.EMBED_WORKER = 'false';

    service.autoStart();

    expect(spawn).not.toHaveBeenCalled();
    expect(service.getStatus()).toEqual({ embedEnabled: false, running: false, paused: false });
  });

  it('lance le worker au autoStart() si EMBED_WORKER === "true"', () => {
    process.env.EMBED_WORKER = 'true';
    (spawn as jest.Mock).mockReturnValue(createMockChild());

    service.autoStart();

    expect(spawn).toHaveBeenCalledTimes(1);
    expect(service.getStatus()).toEqual({ embedEnabled: true, running: true, paused: false });
  });

  it('pause() tue le process enfant et le marque paused', () => {
    process.env.EMBED_WORKER = 'true';
    const child = createMockChild();
    (spawn as jest.Mock).mockReturnValue(child);
    service.autoStart();

    const status = service.pause();

    expect(child.kill).toHaveBeenCalled();
    expect(status).toEqual({ embedEnabled: true, running: false, paused: true });
  });

  it('resume() relance un nouveau process après une pause', () => {
    process.env.EMBED_WORKER = 'true';
    (spawn as jest.Mock).mockReturnValue(createMockChild());
    service.autoStart();
    service.pause();

    const secondChild = createMockChild();
    (spawn as jest.Mock).mockReturnValue(secondChild);
    const status = service.resume();

    expect(spawn).toHaveBeenCalledTimes(2);
    expect(status).toEqual({ embedEnabled: true, running: true, paused: false });
  });

  it("resume() ne relance rien si EMBED_WORKER != 'true' (pas de worker embarqué en local)", () => {
    process.env.EMBED_WORKER = 'false';

    const status = service.resume();

    expect(spawn).not.toHaveBeenCalled();
    expect(status).toEqual({ embedEnabled: false, running: false, paused: false });
  });

  it('la sortie du process enfant met à jour running sans intervention', () => {
    process.env.EMBED_WORKER = 'true';
    const child = createMockChild();
    (spawn as jest.Mock).mockReturnValue(child);
    service.autoStart();

    child.emit('exit', 1);

    expect(service.getStatus().running).toBe(false);
  });
});
