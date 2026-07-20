import { useState, type DragEvent } from "react";
import { Link } from "react-router-dom";
import { localCourses } from "../lib/storage";
import { downloadBlob, exportZip, filesFromSelection } from "../mcf/zip";
import type { CourseSource, ParsedCourse, ValidationIssue, VirtualFile } from "../types";

type Compilation = {
  course?: ParsedCourse;
  files?: VirtualFile[];
  issues: ValidationIssue[];
  metadata?: Record<string, unknown>;
};

function compileInWorker(source: CourseSource): Promise<Compilation> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../workers/compiler.worker.ts", import.meta.url), {
      type: "module",
    });
    const id = crypto.randomUUID();
    worker.onmessage = (
      event: MessageEvent<{ id: string; result?: Compilation; error?: string }>,
    ) => {
      if (event.data.id !== id) return;
      worker.terminate();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data.result!);
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message));
    };
    worker.postMessage({ id, source });
  });
}

export default function CompilePage() {
  const [source, setSource] = useState<CourseSource>();
  const [result, setResult] = useState<Compilation>();
  const [message, setMessage] = useState("Choose a ZIP, folder, or set of MCF files.");
  const [working, setWorking] = useState(false);
  async function receive(files: FileList | File[]) {
    setWorking(true);
    setResult(undefined);
    try {
      const virtualFiles = await filesFromSelection(files);
      const pending: CourseSource = {
        id: "imported-course",
        title: "Imported course",
        origin: "imported",
        files: virtualFiles,
        updatedAt: new Date().toISOString(),
      };
      setSource(pending);
      setMessage(`${virtualFiles.length} files loaded locally. Nothing was uploaded.`);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setWorking(false);
    }
  }
  async function validate() {
    if (!source) return;
    setWorking(true);
    setMessage("Validating and compiling in a Web Worker…");
    try {
      const compiled = await compileInWorker(source);
      setResult(compiled);
      if (compiled.course) {
        const saved = { ...source, id: compiled.course.id, title: compiled.course.title };
        setSource(saved);
        await localCourses.put(saved);
        setMessage(
          `Valid ${compiled.course.mcf} course. Saved locally and compiled ${compiled.files?.length ?? 0} output files.`,
        );
      } else setMessage("Validation found errors. No compiled output was created.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setWorking(false);
    }
  }
  const drop = (event: DragEvent) => {
    event.preventDefault();
    void receive(event.dataTransfer.files);
  };
  return (
    <div className="page compile-page stack-lg">
      <header className="page-header">
        <p className="eyebrow">Browser compiler</p>
        <h1>Bring an MCF course.</h1>
        <p className="lede">Import, validate, preview, and export without uploading a byte.</p>
      </header>
      <section
        className="drop-zone card"
        onDragOver={(event) => event.preventDefault()}
        onDrop={drop}
      >
        <span aria-hidden="true">⇩</span>
        <h2>Drop a course here</h2>
        <p>
          ZIP, selected folder, or multiple source files. Maximum 50 MB compressed and 200 MB
          expanded.
        </p>
        <label className="button secondary">
          Choose ZIP or files
          <input
            className="visually-hidden"
            multiple
            type="file"
            onChange={(event) => event.target.files && void receive(event.target.files)}
          />
        </label>
        <label className="button secondary">
          Choose folder
          <input
            className="visually-hidden"
            multiple
            type="file"
            {...{ webkitdirectory: "" }}
            onChange={(event) => event.target.files && void receive(event.target.files)}
          />
        </label>
      </section>
      <div className="notice" role="status" aria-live="polite">
        {message}
      </div>
      {source ? (
        <div className="actions">
          <button className="button" disabled={working} onClick={() => void validate()}>
            {working ? "Working…" : "Validate and compile"}
          </button>
          <button
            className="button secondary"
            onClick={() =>
              void exportZip(source.files).then((blob) =>
                downloadBlob(blob, `${source.id}-source.zip`),
              )
            }
          >
            Download original source
          </button>
        </div>
      ) : null}
      {result?.issues.length ? (
        <section className="card">
          <h2>Validation results</h2>
          <ul className="issue-list">
            {result.issues.map((issue, index) => (
              <li key={`${issue.file}-${index}`}>
                <strong>{issue.file}</strong> — {issue.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {result?.course && result.files ? (
        <section className="card compiled-result">
          <p className="eyebrow">Compiled successfully</p>
          <h2>{result.course.title}</h2>
          <p>
            {result.course.chapters.length} chapters ·{" "}
            {result.course.chapters.flatMap((chapter) => chapter.lessons).length} lessons
          </p>
          <div className="actions">
            <Link className="button" to={`/courses/${result.course.id}/learn`}>
              Preview in Theoria
            </Link>
            <button
              className="button secondary"
              onClick={() =>
                void exportZip(result.files!).then((blob) =>
                  downloadBlob(blob, `${result.course!.id}-theoria.zip`),
                )
              }
            >
              Download Theoria ZIP
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
