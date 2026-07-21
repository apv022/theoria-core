import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  generateSource,
  initialDraft,
  newQuestion,
  slug,
  uniqueId,
  type CourseDraft,
  type DraftActivity,
  type DraftChapter,
  type DraftLesson,
} from "../authoring/model";
import { localCourses, settingsStore } from "../lib/storage";
import { downloadBlob, exportZip } from "../mcf/zip";
import type { ActivityType, QuestionType, VirtualFile } from "../types";

const questionTypes: QuestionType[] = [
  "multiple_choice",
  "multiple_select",
  "true_false",
  "numeric",
  "short_answer",
  "essay",
];
const clone = <T,>(value: T): T => structuredClone(value);

export default function CreatePage() {
  const [draft, setDraft] = useState<CourseDraft>(initialDraft);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [status, setStatus] = useState("Saved locally");
  const [dragged, setDragged] = useState<number>();
  useEffect(() => {
    void settingsStore.get<CourseDraft>("authoring-draft").then((saved) => {
      if (saved) setDraft(saved);
    });
  }, []);
  const source = useMemo(() => generateSource(draft), [draft]);
  useEffect(() => {
    const timer = setTimeout(() => {
      void Promise.all([localCourses.put(source), settingsStore.put("authoring-draft", draft)])
        .then(() => setStatus("Saved locally"))
        .catch(() => setStatus("Browser storage is full or unavailable"));
    }, 350);
    return () => clearTimeout(timer);
  }, [draft, source]);
  const chapter = draft.chapters[chapterIndex] ?? draft.chapters[0]!;
  const lesson = chapter.lessons[lessonIndex] ?? chapter.lessons[0]!;
  const edit = (change: (next: CourseDraft) => void) =>
    setDraft((current) => {
      const next = clone(current);
      change(next);
      return next;
    });
  const editChapter = (change: (next: DraftChapter) => void) =>
    edit((next) => change(next.chapters[chapterIndex]!));
  const editLesson = (change: (next: DraftLesson) => void) =>
    editChapter((next) => change(next.lessons[lessonIndex]!));
  const addChapter = () => {
    const id = uniqueId(
      "new-chapter",
      draft.chapters.map((item) => item.id),
    );
    edit((next) =>
      next.chapters.push({
        id,
        title: "New chapter",
        description: "",
        lessons: [
          {
            id: "new-lesson",
            title: "New lesson",
            description: "",
            activities: [
              {
                id: "new-lesson-notes",
                type: "notes",
                title: "Learn",
                content: "Write lesson notes here.",
                questions: [],
              },
            ],
          },
        ],
      }),
    );
    setChapterIndex(draft.chapters.length);
    setLessonIndex(0);
  };
  const addLesson = () => {
    const id = uniqueId(
      "new-lesson",
      chapter.lessons.map((item) => item.id),
    );
    editChapter((next) =>
      next.lessons.push({
        id,
        title: "New lesson",
        description: "",
        activities: [
          {
            id: `${id}-notes`,
            type: "notes",
            title: "Learn",
            content: "Write lesson notes here.",
            questions: [],
          },
        ],
      }),
    );
    setLessonIndex(chapter.lessons.length);
  };
  const deleteLesson = (index: number) => {
    if (chapter.lessons.length <= 1) return;
    if (!window.confirm(`Delete lesson “${chapter.lessons[index]?.title}”?`)) return;
    editChapter((next) => next.lessons.splice(index, 1));
    setLessonIndex((current) => Math.min(current, chapter.lessons.length - 2));
  };
  const deleteChapter = (index: number) => {
    if (draft.chapters.length <= 1) return;
    if (window.confirm(`Delete chapter “${draft.chapters[index]?.title}” and its lessons?`)) {
      edit((next) => next.chapters.splice(index, 1));
      setChapterIndex((current) => Math.min(current, draft.chapters.length - 2));
      setLessonIndex(0);
    }
  };
  const duplicateLesson = (index: number) => {
    const original = chapter.lessons[index]!;
    const id = uniqueId(
      `${original.id}-copy`,
      chapter.lessons.map((item) => item.id),
    );
    editChapter((next) => {
      const copy = clone(original);
      copy.id = id;
      copy.title += " copy";
      copy.activities.forEach((activity, activityIndex) => {
        activity.id = `${id}-${activity.type}-${activityIndex + 1}`;
      });
      next.lessons.splice(index + 1, 0, copy);
    });
    setLessonIndex(index + 1);
  };
  const addActivity = (type: ActivityType) =>
    editLesson((next) =>
      next.activities.push({
        id: uniqueId(
          `${lesson.id}-${type}`,
          next.activities.map((item) => item.id),
        ),
        type,
        title: type === "notes" ? "Learn" : type === "practice" ? "Practice" : "Assessment",
        content: type === "notes" ? "Write content here." : "",
        passingScore: type === "assessment" ? 0.7 : undefined,
        questions: [],
      }),
    );
  const addQuestion = (activityIndex: number, type: QuestionType) =>
    editLesson((next) => {
      const all = next.activities.flatMap((item) => item.questions.map((question) => question.id));
      next.activities[activityIndex]!.questions.push(newQuestion(type, all));
    });
  const addMedia = async (files: FileList | null, cover = false) => {
    if (!files) return;
    const additions = await Promise.all(
      [...files].map(async (file) => ({
        path: `assets/${slug(file.name.replace(/\.[^.]+$/, ""))}.${file.name.split(".").pop()?.toLowerCase()}`,
        data: new Uint8Array(await file.arrayBuffer()),
        type: file.type,
      })),
    );
    edit((next) => {
      next.media.push(...additions);
      if (cover && additions[0]) next.cover = additions[0].path;
    });
  };
  const removeAsset = (path: string) => {
    edit((next) => {
      next.media = next.media.filter((file) => file.path !== path);
      if (next.cover === path) next.cover = undefined;
    });
  };
  const copyAssetPath = (path: string) => {
    const clipboard = navigator.clipboard;
    if (!clipboard) return;
    void clipboard.writeText(path).then(() => setStatus(`Copied ${path}`));
  };
  const persistNow = () =>
    Promise.all([localCourses.put(source), settingsStore.put("authoring-draft", draft)]).then(() =>
      setStatus("Saved locally"),
    );
  return (
    <div className="page studio stack-lg">
      <header className="page-header">
        <p className="eyebrow">Creator studio · {status}</p>
        <h1>Create a course</h1>
        <p className="lede">Structured editing produces portable MCF 1.0 source as you work.</p>
        <div className="actions">
          <Link
            className="button"
            onClick={() => void persistNow()}
            to={`/courses/${draft.id}/learn`}
          >
            Preview course
          </Link>
          <button
            className="button secondary"
            onClick={() =>
              void persistNow().then(() =>
                exportZip(source.files).then((blob) =>
                  downloadBlob(blob, `${draft.id}-source.zip`),
                ),
              )
            }
          >
            Export MCF ZIP
          </button>
        </div>
      </header>
      <section className="studio-grid">
        <aside className="studio-outline card">
          <h2>Structure</h2>
          <div className="chapter-tabs">
            {draft.chapters.map((item, index) => (
              <button
                className={index === chapterIndex ? "current" : ""}
                key={item.id}
                onClick={() => {
                  setChapterIndex(index);
                  setLessonIndex(0);
                }}
              >
                {item.title}
              </button>
            ))}
          </div>
          <button className="text-button" onClick={addChapter}>
            + Chapter
          </button>
          <button
            className="text-button danger"
            disabled={draft.chapters.length <= 1}
            onClick={() => deleteChapter(chapterIndex)}
          >
            Delete chapter
          </button>
          <ol>
            {chapter.lessons.map((item, index) => (
              <li
                draggable
                onDragStart={() => setDragged(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (dragged === undefined || dragged === index) return;
                  editChapter((next) => {
                    const [moved] = next.lessons.splice(dragged, 1);
                    next.lessons.splice(index, 0, moved!);
                  });
                  setLessonIndex(index);
                  setDragged(undefined);
                }}
                key={item.id}
              >
                <button
                  className={index === lessonIndex ? "current" : ""}
                  onClick={() => setLessonIndex(index)}
                >
                  {item.title}
                </button>
                <button
                  aria-label={`Duplicate ${item.title}`}
                  onClick={() => duplicateLesson(index)}
                >
                  ⧉
                </button>
                <button
                  className="danger"
                  aria-label={`Delete ${item.title}`}
                  disabled={chapter.lessons.length <= 1}
                  onClick={() => deleteLesson(index)}
                >
                  ×
                </button>
              </li>
            ))}
          </ol>
          <button className="text-button" onClick={addLesson}>
            + Lesson
          </button>
        </aside>
        <div className="studio-editor stack">
          <section className="card form-grid">
            <h2>Course details</h2>
            <label>
              Title
              <input
                value={draft.title}
                onChange={(event) =>
                  edit((next) => {
                    next.title = event.target.value;
                  })
                }
              />
            </label>
            <label>
              Course ID
              <input
                pattern="[a-z][a-z0-9._-]*"
                value={draft.id}
                onChange={(event) =>
                  edit((next) => {
                    next.id = slug(event.target.value);
                  })
                }
              />
            </label>
            <label className="wide">
              Description
              <textarea
                value={draft.description}
                onChange={(event) =>
                  edit((next) => {
                    next.description = event.target.value;
                  })
                }
              />
            </label>
            <label>
              Author
              <input
                value={draft.author}
                onChange={(event) =>
                  edit((next) => {
                    next.author = event.target.value;
                  })
                }
              />
            </label>
            <label>
              Language
              <input
                value={draft.language}
                onChange={(event) =>
                  edit((next) => {
                    next.language = event.target.value;
                  })
                }
              />
            </label>
            <label>
              Version
              <input
                value={draft.version}
                onChange={(event) =>
                  edit((next) => {
                    next.version = event.target.value;
                  })
                }
              />
            </label>
            <label>
              License
              <input
                value={draft.license}
                onChange={(event) =>
                  edit((next) => {
                    next.license = event.target.value;
                  })
                }
              />
            </label>
            <label className="wide">
              Cover image
              <input
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                type="file"
                onChange={(event) => void addMedia(event.target.files, true)}
              />
            </label>
          </section>
          <section className="card stack asset-library">
            <div className="section-heading">
              <h2>Assets</h2>
              <p className="muted">
                Add reusable images, audio, and video here. Use the displayed path in lesson
                Markdown or media references.
              </p>
            </div>
            <label className="button secondary asset-upload">
              Add assets
              <input
                className="visually-hidden"
                multiple
                accept="image/*,audio/*,video/*"
                type="file"
                onChange={(event) => void addMedia(event.target.files)}
              />
            </label>
            {draft.media.length ? (
              <div className="media-preview" aria-label="Course assets">
                {draft.media.map((file) => (
                  <MediaPreview
                    file={file}
                    isCover={file.path === draft.cover}
                    key={file.path}
                    onCopy={() => copyAssetPath(file.path)}
                    onRemove={() => removeAsset(file.path)}
                  />
                ))}
              </div>
            ) : (
              <p className="muted">No assets added yet.</p>
            )}
          </section>
          <section className="card form-grid">
            <h2>Chapter</h2>
            <label>
              Title
              <input
                value={chapter.title}
                onChange={(event) =>
                  editChapter((next) => {
                    next.title = event.target.value;
                  })
                }
              />
            </label>
            <label>
              ID
              <input
                value={chapter.id}
                onChange={(event) =>
                  editChapter((next) => {
                    next.id = slug(event.target.value);
                  })
                }
              />
            </label>
            <label className="wide">
              Description
              <input
                value={chapter.description}
                onChange={(event) =>
                  editChapter((next) => {
                    next.description = event.target.value;
                  })
                }
              />
            </label>
          </section>
          <section className="card form-grid">
            <h2>Lesson</h2>
            <label>
              Title
              <input
                value={lesson.title}
                onChange={(event) =>
                  editLesson((next) => {
                    next.title = event.target.value;
                  })
                }
              />
            </label>
            <label>
              ID
              <input
                value={lesson.id}
                onChange={(event) =>
                  editLesson((next) => {
                    next.id = slug(event.target.value);
                  })
                }
              />
            </label>
            <label className="wide">
              Description
              <input
                value={lesson.description}
                onChange={(event) =>
                  editLesson((next) => {
                    next.description = event.target.value;
                  })
                }
              />
            </label>
          </section>
          {lesson.activities.map((activity, activityIndex) => (
            <ActivityEditor
              activity={activity}
              key={activity.id}
              onEdit={(change) => editLesson((next) => change(next.activities[activityIndex]!))}
              onDuplicate={() =>
                editLesson((next) => {
                  const copy = clone(next.activities[activityIndex]!);
                  copy.id = uniqueId(
                    `${copy.id}-copy`,
                    next.activities.map((item) => item.id),
                  );
                  next.activities.splice(activityIndex + 1, 0, copy);
                })
              }
              onAddQuestion={(type) => addQuestion(activityIndex, type)}
            />
          ))}
          <div className="actions">
            <button className="button secondary" onClick={() => addActivity("notes")}>
              + Notes
            </button>
            <button className="button secondary" onClick={() => addActivity("practice")}>
              + Practice
            </button>
            <button className="button secondary" onClick={() => addActivity("assessment")}>
              + Assessment
            </button>
          </div>
          <SourcePreview files={source.files} />
        </div>
      </section>
    </div>
  );
}

function SourcePreview({ files }: { files: VirtualFile[] }) {
  const [selectedPath, setSelectedPath] = useState("manifest.yaml");
  const directories = useMemo(() => {
    const result = new Set<string>();
    files.forEach((file) => {
      const parts = file.path.split("/");
      parts.slice(0, -1).forEach((_, index) => result.add(parts.slice(0, index + 1).join("/")));
    });
    return result;
  }, [files]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(directories));
  const selected = files.find((file) => file.path === selectedPath) ?? files[0];
  const entries = useMemo(() => {
    const paths = new Set<string>([...files.map((file) => file.path), ...directories]);
    return [...paths].sort((a, b) => {
      const aDir = directories.has(a);
      const bDir = directories.has(b);
      return Number(bDir) - Number(aDir) || a.localeCompare(b, undefined, { numeric: true });
    });
  }, [directories, files]);
  const visible = entries.filter((path) => {
    const parts = path.split("/");
    return parts
      .slice(0, -1)
      .every((_, index) => expanded.has(parts.slice(0, index + 1).join("/")));
  });
  const toggleDirectory = (path: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  return (
    <section className="source-browser card" aria-label="MCF source preview">
      <div className="section-heading">
        <p className="eyebrow">Source package</p>
        <h2>Browse source files</h2>
        <p className="muted">{files.length} files · directories before files</p>
      </div>
      <div className="source-browser-grid">
        <div className="source-tree" role="tree" aria-label="Course source files">
          {visible.map((path) => {
            const directory = directories.has(path);
            const depth = path.split("/").length - 1;
            return directory ? (
              <button
                className="source-tree-entry"
                style={{ paddingLeft: `${0.5 + depth * 1}rem` }}
                key={path}
                role="treeitem"
                aria-expanded={expanded.has(path)}
                onClick={() => toggleDirectory(path)}
              >
                {expanded.has(path) ? "⌄" : "›"} {path.split("/").pop()}/
              </button>
            ) : (
              <button
                className={`source-tree-entry ${selected?.path === path ? "selected" : ""}`}
                style={{ paddingLeft: `${1.7 + depth * 1}rem` }}
                key={path}
                role="treeitem"
                aria-selected={selected?.path === path}
                onClick={() => setSelectedPath(path)}
              >
                {path.split("/").pop()}
              </button>
            );
          })}
        </div>
        <SourceFilePreview file={selected} />
      </div>
    </section>
  );
}

function SourceFilePreview({ file }: { file?: VirtualFile }) {
  const url = useMemo(() => {
    if (!file?.type?.startsWith("image/")) return undefined;
    return URL.createObjectURL(new Blob([file.data as BlobPart], { type: file.type }));
  }, [file]);
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);
  if (!file) return <p className="muted">No source files found.</p>;
  const isText =
    file.type?.startsWith("text/") || /\.(md|mcf|ya?ml|json|txt|css|js|ts|html)$/i.test(file.path);
  return (
    <div className="source-file-preview">
      <strong>{file.path}</strong>
      {url ? (
        <img src={url} alt={`Preview of ${file.path}`} />
      ) : isText ? (
        <pre>{new TextDecoder().decode(file.data)}</pre>
      ) : (
        <p className="muted">Binary file · {file.data.byteLength.toLocaleString()} bytes</p>
      )}
    </div>
  );
}

function MediaPreview({
  file,
  isCover,
  onCopy,
  onRemove,
}: {
  file: VirtualFile;
  isCover?: boolean;
  onCopy?: () => void;
  onRemove?: () => void;
}) {
  const url = useMemo(
    () => URL.createObjectURL(new Blob([file.data as BlobPart], { type: file.type })),
    [file],
  );
  useEffect(() => {
    return () => URL.revokeObjectURL(url);
  }, [url]);
  const alt = file.path.split("/").pop() ?? "Attached media";
  const details = (
    <figcaption>
      <code>{file.path}</code>
      {isCover ? <span className="asset-badge">Cover</span> : null}
      <span className="asset-actions">
        {onCopy ? (
          <button className="text-button" onClick={onCopy}>
            Copy path
          </button>
        ) : null}
        {onRemove ? (
          <button className="text-button danger" onClick={onRemove}>
            Remove
          </button>
        ) : null}
      </span>
    </figcaption>
  );
  if (file.type?.startsWith("audio/"))
    return (
      <figure>
        {<audio controls src={url} />}
        {details}
      </figure>
    );
  if (file.type?.startsWith("video/"))
    return (
      <figure>
        {<video controls src={url} />}
        {details}
      </figure>
    );
  return (
    <figure>
      <img src={url} alt={alt} />
      {details}
    </figure>
  );
}

function ActivityEditor({
  activity,
  onEdit,
  onDuplicate,
  onAddQuestion,
}: {
  activity: DraftActivity;
  onEdit: (change: (activity: DraftActivity) => void) => void;
  onDuplicate: () => void;
  onAddQuestion: (type: QuestionType) => void;
}) {
  const [type, setType] = useState<QuestionType>("multiple_choice");
  return (
    <section className="activity-editor card stack">
      <div className="section-row">
        <div>
          <p className="activity-type">{activity.type}</p>
          <h2>{activity.title}</h2>
        </div>
        <button className="text-button" onClick={onDuplicate}>
          Duplicate activity
        </button>
      </div>
      <div className="form-grid">
        <label>
          Title
          <input
            value={activity.title}
            onChange={(event) =>
              onEdit((next) => {
                next.title = event.target.value;
              })
            }
          />
        </label>
        <label>
          ID
          <input
            value={activity.id}
            onChange={(event) =>
              onEdit((next) => {
                next.id = slug(event.target.value);
              })
            }
          />
        </label>
        {activity.type === "assessment" ? (
          <label>
            Passing score
            <input
              min="0"
              max="1"
              step="0.05"
              type="number"
              value={activity.passingScore ?? 0.7}
              onChange={(event) =>
                onEdit((next) => {
                  next.passingScore = Number(event.target.value);
                })
              }
            />
          </label>
        ) : null}
        {activity.type !== "notes" ? (
          <>
            <label>
              <span>Randomize questions</span>
              <input
                checked={activity.randomize ?? false}
                type="checkbox"
                onChange={(event) =>
                  onEdit((next) => {
                    next.randomize = event.target.checked;
                  })
                }
              />
            </label>
            <label>
              Question pool size
              <input
                min="1"
                placeholder="All questions"
                type="number"
                value={activity.questionPoolSize ?? ""}
                onChange={(event) =>
                  onEdit((next) => {
                    next.questionPoolSize = event.target.value
                      ? Number(event.target.value)
                      : undefined;
                  })
                }
              />
            </label>
          </>
        ) : null}
        <label className="wide">
          Markdown content
          <textarea
            rows={10}
            value={activity.content}
            onChange={(event) =>
              onEdit((next) => {
                next.content = event.target.value;
              })
            }
          />
        </label>
      </div>
      {activity.questions.map((question, index) => (
        <div className="question-editor" key={question.id}>
          <div className="section-row">
            <strong>{question.type.replaceAll("_", " ")}</strong>
            <button
              className="text-button"
              onClick={() =>
                onEdit((next) => {
                  const copy = clone(question);
                  copy.id = uniqueId(
                    `${copy.id}-copy`,
                    next.questions.map((item) => item.id),
                  );
                  next.questions.splice(index + 1, 0, copy);
                })
              }
            >
              Duplicate question
            </button>
          </div>
          <label>
            Prompt
            <textarea
              value={question.prompt}
              onChange={(event) =>
                onEdit((next) => {
                  next.questions[index]!.prompt = event.target.value;
                })
              }
            />
          </label>
          <label>
            ID
            <input
              value={question.id}
              onChange={(event) =>
                onEdit((next) => {
                  next.questions[index]!.id = slug(event.target.value);
                })
              }
            />
          </label>
          {question.options.length ? (
            <label>
              Options (one per line)
              <textarea
                value={question.options.map((option) => `${option.id}: ${option.text}`).join("\n")}
                onChange={(event) =>
                  onEdit((next) => {
                    next.questions[index]!.options = event.target.value
                      .split("\n")
                      .filter(Boolean)
                      .map((line, optionIndex) => {
                        const [rawId, ...words] = line.split(":");
                        return {
                          id: slug(rawId || `option-${optionIndex + 1}`),
                          text: words.join(":").trim() || rawId || "Option",
                        };
                      });
                  })
                }
              />
            </label>
          ) : null}
          {question.type !== "essay" ? (
            <label>
              Answer
              <input
                value={
                  Array.isArray(question.answer)
                    ? question.answer.join(",")
                    : String(question.answer ?? "")
                }
                onChange={(event) =>
                  onEdit((next) => {
                    const current = next.questions[index]!;
                    current.answer =
                      current.type === "multiple_select"
                        ? event.target.value.split(",").map((value) => slug(value.trim()))
                        : event.target.value;
                  })
                }
              />
            </label>
          ) : (
            <label>
              Minimum words
              <input
                min="1"
                type="number"
                value={question.minimumWords ?? 20}
                onChange={(event) =>
                  onEdit((next) => {
                    next.questions[index]!.minimumWords = Number(event.target.value);
                  })
                }
              />
            </label>
          )}
          {question.type === "essay" ? (
            <>
              <label>
                Minimum sentences
                <input
                  min="1"
                  type="number"
                  value={question.minimumSentences ?? ""}
                  onChange={(event) =>
                    onEdit((next) => {
                      next.questions[index]!.minimumSentences = event.target.value
                        ? Number(event.target.value)
                        : undefined;
                    })
                  }
                />
              </label>
              <label>
                Required concepts (comma separated)
                <input
                  value={question.keywords?.join(", ") ?? ""}
                  onChange={(event) =>
                    onEdit((next) => {
                      next.questions[index]!.keywords = event.target.value
                        .split(",")
                        .map((value) => value.trim())
                        .filter(Boolean);
                    })
                  }
                />
              </label>
              <label>
                Minimum concepts
                <input
                  min="1"
                  type="number"
                  value={question.minimumKeywords ?? ""}
                  onChange={(event) =>
                    onEdit((next) => {
                      next.questions[index]!.minimumKeywords = event.target.value
                        ? Number(event.target.value)
                        : undefined;
                    })
                  }
                />
              </label>
            </>
          ) : null}
          <label>
            Hint
            <input
              value={question.hint}
              onChange={(event) =>
                onEdit((next) => {
                  next.questions[index]!.hint = event.target.value;
                })
              }
            />
          </label>
          <label>
            Explanation
            <textarea
              value={question.explanation}
              onChange={(event) =>
                onEdit((next) => {
                  next.questions[index]!.explanation = event.target.value;
                })
              }
            />
          </label>
        </div>
      ))}
      <div className="actions">
        <select
          aria-label="Question type"
          value={type}
          onChange={(event) => setType(event.target.value as QuestionType)}
        >
          {questionTypes.map((item) => (
            <option value={item} key={item}>
              {item.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <button className="button secondary" onClick={() => onAddQuestion(type)}>
          + Question
        </button>
      </div>
    </section>
  );
}
