import React, { useEffect, useMemo, useState } from 'react';
import {
  Inbox,
  Send,
  Archive,
  Trash2,
  Paperclip,
  Clock,
  Star,
  StarOff,
  Search,
  User as User2,
  Upload,
  Download,
  RefreshCw,
  Plus
} from 'lucide-react';

// Utility to generate a short unique identifier. Email IDs are generated on
// initialisation to ensure list stability when the scenario reloads.
const uid = () => Math.random().toString(36).slice(2, 10);

// Format an ISO timestamp into a human‑readable Singapore time. If the
// browser throws, just return the original string.
const sgDate = (iso) => {
  try {
    return new Intl.DateTimeFormat('en-SG', {
      dateStyle: 'medium',
      timeStyle: 'short',
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

// A small sample of messages to bootstrap the case study mailbox. You can
// modify or replace these with your own scenario when importing JSON.
const sampleEmails = [
  {
    id: uid(),
    subject: 'Welcome to the Case Study: Southeast Stage Works',
    from: { name: 'Course Chair (Chien)', email: 'chien@np.edu.sg' },
    to: [{ name: 'Student', email: 'student@learn.sg' }],
    date: new Date().toISOString(),
    folder: 'Inbox',
    unread: true,
    tags: ['Case Intro'],
    body: `<p>Hi team,<br/>\nWelcome to this simulated mailbox. Over the next two weeks, you’ll receive staged emails that reveal details for the <strong>SSW</strong> financial management case. Start by reading everything in <em>Inbox</em> and use <strong>Import / Export</strong> to load the official scenario JSON.</p>`
  },
  {
    id: uid(),
    subject: 'Sponsorship Query: Budget Breakdown for Q4 Programme',
    from: { name: 'Wei Han (Artistic Director, SSW)', email: 'weihan@ssw.sg' },
    to: [{ name: 'You', email: 'student@learn.sg' }],
    cc: [{ name: 'Finance', email: 'finance@ssw.sg' }],
    date: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    folder: 'Inbox',
    unread: true,
    tags: ['Budget', 'Sponsorship'],
    attachments: [
      { name: 'Q4_cost_items.xlsx', sizeKB: 128 },
      { name: 'Venue_quote.pdf', sizeKB: 412 },
    ],
    body: `<p>Hi,<br/>\nWe’re preparing a sponsorship approach for our Q4 programme at the Esplanade. Can you review the attached cost items and propose <strong>two funding mixes</strong>: (a) grant‑heavy, (b) revenue‑heavy?\n</p>\n<ul>\n<li>Target capacity: 220 seats</li>\n<li>Run: 8 shows</li>\n<li>Target paid occupancy: 65% baseline</li>\n<li>Student concession pricing requested</li>\n</ul>\n<p>We also need a <em>break‑even</em> estimate and 1 sensitivity scenario (–15% ticket sales). Thanks!</p>`
  },
  {
    id: uid(),
    subject: 'Grant Window Clarification',
    from: { name: 'NAC Grants Officer', email: 'grants@nac.gov.sg' },
    to: [{ name: 'SSW Team', email: 'team@ssw.sg' }],
    date: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    folder: 'Inbox',
    unread: false,
    tags: ['Grants'],
    body: `<p>Dear applicants,<br/>\nA reminder that the <strong>Presentation & Participation</strong> grant call closes at <strong>5:00pm SGT, 28 Aug</strong>. Projects must commence <em>after</em> award. Please ensure marketing and community engagement lines are clearly costed.</p>`
  },
  {
    id: uid(),
    subject: 'RE: Sponsorship Query – Budget Notes',
    from: { name: 'Finance (SSW)', email: 'finance@ssw.sg' },
    to: [{ name: 'You', email: 'student@learn.sg' }],
    date: new Date(Date.now() - 40 * 3600 * 1000).toISOString(),
    folder: 'Inbox',
    unread: false,
    tags: ['Budget'],
    attachments: [{ name: 'Cost-centres.csv', sizeKB: 56 }],
    body: `<p>For quick reference:</p>\n<ul>\n<li>Venue hire per show includes tech labour.</li>\n<li>Marketing split: 60% digital, 40% on-ground.</li>\n<li>Merch margin ~35% after COGS.</li>\n</ul>`
  },
  {
    id: uid(),
    subject: 'Thanks for your email',
    from: { name: 'Student (You)', email: 'student@learn.sg' },
    to: [{ name: 'Wei Han (SSW)', email: 'weihan@ssw.sg' }],
    date: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    folder: 'Sent',
    unread: false,
    tags: ['Follow-up'],
    body: `<p>Hi Wei Han,<br/>\nReceived. I’ll revert with two funding mixes, a break‑even estimate, and a sensitivity run by tomorrow.</p>`
  },
];

// A reusable folder navigation item. Displays an icon, label and unread count.
function FolderItem({ name, icon, active, count = 0, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between px-3 py-2 rounded-lg transition-colors ${active ? 'bg-gray-100' : ''} hover:bg-gray-100`}
    >
      <span className="flex items-center gap-2">
        {icon}
        <span className="font-medium text-sm">{name}</span>
      </span>
      {count > 0 && (
        <span className="min-w-[22px] h-[22px] px-1 text-xs font-semibold bg-indigo-100 text-indigo-600 rounded-full grid place-items-center">
          {count}
        </span>
      )}
    </button>
  );
}

export default function App() {
  const STORAGE_KEY = 'finmgt_case_emails_v1';

  // Initialise emails from localStorage or fall back to sample. Use a function
  // form to avoid reading localStorage on every render.
  const [emails, setEmails] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : sampleEmails;
    } catch {
      return sampleEmails;
    }
  });
  const [folder, setFolder] = useState('Inbox');
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [jsonText, setJsonText] = useState('');

  // Persist emails to localStorage whenever they change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(emails));
    } catch {
      // ignore if storage quota is exceeded
    }
  }, [emails]);

  // When opening the modal, synchronise the JSON textarea with current emails.
  useEffect(() => {
    if (modalOpen) {
      setJsonText(JSON.stringify(emails, null, 2));
    }
  }, [modalOpen, emails]);

  // Compute unread counts per folder.
  const counts = useMemo(() => {
    const c = { Inbox: 0, Sent: 0, Archive: 0, Spam: 0, Trash: 0 };
    for (const e of emails) {
      if (e.unread) c[e.folder] = (c[e.folder] || 0) + 1;
    }
    return c;
  }, [emails]);

  // Derive the list of messages shown in the current view based on folder,
  // unread filter and search query.
  const list = useMemo(() => {
    let arr = emails.filter((e) => e.folder === folder);
    if (onlyUnread) arr = arr.filter((e) => e.unread);
    const q = query.trim().toLowerCase();
    if (q) {
      arr = arr.filter((e) => {
        const searchSpace = [
          e.subject,
          e.from.name,
          e.from.email,
          e.body,
          ...(e.tags || []),
        ]
          .join(' \n ')
          .toLowerCase();
        return searchSpace.includes(q);
      });
    }
    return arr.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [emails, folder, query, onlyUnread]);

  // Determine which message is currently selected. If selectedId is null,
  // default to the first message in the list.
  const selected = useMemo(() => {
    return list.find((e) => e.id === selectedId) || list[0];
  }, [list, selectedId]);

  // Whenever the list changes and there is no selected message, select the first
  // message (if any). This ensures the reading pane is not blank.
  useEffect(() => {
    if (!selectedId && list.length > 0) {
      setSelectedId(list[0].id);
    }
  }, [list, selectedId]);

  // --- Message actions ---
  const markRead = (id, unread) => {
    setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, unread } : e)));
  };
  const toggleStar = (id) => {
    setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, starred: !e.starred } : e)));
  };
  const moveTo = (id, dest) => {
    setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, folder: dest } : e)));
  };
  const remove = (id) => moveTo(id, 'Trash');
  const restore = (id) => moveTo(id, 'Inbox');

  // Export current mailbox to a JSON file. Uses a Blob so the browser will
  // trigger a file download.
  const exportJSON = () => {
    try {
      const blob = new Blob([JSON.stringify(emails, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'finmgt_case_emails.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  // Import a scenario from the JSON textarea. If parsing fails or the shape
  // doesn't match expectations, an alert is shown to the user.
  const importJSON = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) throw new Error('JSON must be an array of emails');
      parsed.forEach((e) => {
        if (!e.id) e.id = uid();
        if (!e.subject || !e.from || !e.date || !e.folder || !e.body) {
          throw new Error('Each email needs subject, from, date, folder and body');
        }
        if (!e.to) e.to = [{ name: 'Student', email: 'student@example.com' }];
      });
      setEmails(parsed);
      setFolder('Inbox');
      setSelectedId(null);
      setModalOpen(false);
    } catch (err) {
      alert('Import failed: ' + err.message);
    }
  };

  // Reset the mailbox back to the sample scenario. New IDs are generated for
  // each message to avoid collisions with any previously saved data.
  const resetSample = () => {
    setEmails(sampleEmails.map((e) => ({ ...e, id: uid() })));
    setFolder('Inbox');
    setSelectedId(null);
    setModalOpen(false);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top navigation bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b bg-white/80 backdrop-blur px-4 py-3">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">MockMail</h1>
          <span className="ml-2 px-2 py-0.5 text-xs border rounded-full bg-gray-50 text-gray-600">Teaching Tool</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Desktop search */}
          <div className="hidden md:flex items-center gap-2 border rounded-lg px-2 py-1">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search subject, sender, tags..."
              className="h-7 border-0 focus:outline-none focus:ring-0 text-sm"
            />
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            <Upload className="h-4 w-4" />
            <span>Import / Export</span>
          </button>
          <button
            onClick={resetSample}
            className="flex items-center gap-1 px-3 py-2 border rounded-lg text-sm text-red-600 hover:bg-red-50"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Reset sample</span>
          </button>
        </div>
      </header>

      {/* Mobile search */}
      <div className="md:hidden px-4 py-2 border-b">
        <div className="flex items-center gap-2 border rounded-lg px-2 py-1">
          <Search className="h-4 w-4 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search mail"
            className="h-7 border-0 focus:outline-none focus:ring-0 text-sm flex-1"
          />
        </div>
      </div>

      {/* Main layout */}
      <main className="flex flex-1 overflow-hidden">
        {/* Sidebar (desktop only) */}
        <aside className="hidden md:flex flex-col w-64 border-r p-3 space-y-4 overflow-y-auto">
          <button className="w-full flex items-center justify-center gap-1 px-3 py-2 border rounded-lg bg-gray-50 text-sm cursor-not-allowed" disabled>
            <Plus className="h-4 w-4" />
            Compose (disabled)
          </button>
          <nav className="space-y-1">
            <FolderItem
              name="Inbox"
              icon={<Inbox className="h-4 w-4" />}
              active={folder === 'Inbox'}
              count={counts.Inbox}
              onClick={() => {
                setFolder('Inbox');
                setSelectedId(null);
              }}
            />
            <FolderItem
              name="Sent"
              icon={<Send className="h-4 w-4" />}
              active={folder === 'Sent'}
              count={counts.Sent}
              onClick={() => {
                setFolder('Sent');
                setSelectedId(null);
              }}
            />
            <FolderItem
              name="Archive"
              icon={<Archive className="h-4 w-4" />}
              active={folder === 'Archive'}
              count={counts.Archive}
              onClick={() => {
                setFolder('Archive');
                setSelectedId(null);
              }}
            />
            <FolderItem
              name="Trash"
              icon={<Trash2 className="h-4 w-4" />}
              active={folder === 'Trash'}
              count={counts.Trash}
              onClick={() => {
                setFolder('Trash');
                setSelectedId(null);
              }}
            />
          </nav>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-gray-500 ml-1">Quick tags</p>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(emails.flatMap((e) => e.tags || []))).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 text-xs border rounded-full bg-blue-50 text-blue-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </aside>

        {/* List of messages */}
        <section className="flex flex-col flex-1 md:w-80 lg:w-96 border-r overflow-y-auto">
          {list.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 p-4 text-sm">
              No messages match this view.
            </div>
          ) : (
            <ul className="divide-y">
              {list.map((e) => (
                <li
                  key={e.id}
                  onClick={() => {
                    setSelectedId(e.id);
                    if (e.unread) markRead(e.id, false);
                  }}
                  className={`${selected?.id === e.id ? 'bg-gray-100' : ''} cursor-pointer px-4 py-3 hover:bg-gray-50 transition-colors`}
                >
                  <div className="flex justify-between gap-2">
                    <div className="flex gap-3 min-w-0">
                      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 font-semibold">
                        {(e.from.name || e.from.email).slice(0, 1)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`truncate text-sm ${e.unread ? 'font-semibold' : ''}`}>{e.from.name}</span>
                          {e.tags?.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className={`${e.unread ? 'font-semibold' : ''} truncate`}>{e.subject}</div>
                        <div
                          className="truncate text-sm text-gray-500"
                          dangerouslySetInnerHTML={{ __html: e.body.replace(/<[^>]+>/g, ' ') }}
                        />
                        {e.attachments && e.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {e.attachments.map((a, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-1 border px-2 py-1 rounded-full text-xs"
                              >
                                <Paperclip className="h-3 w-3" />
                                <span className="truncate max-w-[8rem]" title={a.name}>{a.name}</span>
                                {a.sizeKB ? (
                                  <span className="text-gray-500 ml-1">• {a.sizeKB} KB</span>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="whitespace-nowrap text-xs text-gray-500 flex items-center">
                        <Clock className="h-3.5 w-3.5 mr-1" />
                        {sgDate(e.date)}
                      </span>
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          toggleStar(e.id);
                        }}
                        className="p-1 rounded-full hover:bg-gray-100"
                      >
                        {e.starred ? (
                          <Star className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <StarOff className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Reading pane (desktop) */}
        <section className="hidden md:flex flex-col flex-1 overflow-y-auto">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 p-4">
              Select a message to read.
            </div>
          ) : (
            <article className="flex flex-col h-full">
              <div className="flex justify-between gap-2 border-b px-5 py-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold truncate">{selected.subject}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <User2 className="h-4 w-4" />
                      {selected.from.name} &lt;{selected.from.email}&gt;
                    </span>
                    <span>•</span>
                    <span>{sgDate(selected.date)} (SGT)</span>
                    {selected.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 text-xs border rounded-full bg-blue-50 text-blue-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => moveTo(selected.id, 'Archive')}
                    className="px-3 py-1.5 border rounded-lg bg-gray-50 hover:bg-gray-100 text-sm"
                  >
                    Archive
                  </button>
                  {selected.folder !== 'Trash' ? (
                    <button
                      onClick={() => remove(selected.id)}
                      className="px-3 py-1.5 border rounded-lg bg-red-500 text-white hover:bg-red-600 text-sm"
                    >
                      Delete
                    </button>
                  ) : (
                    <button
                      onClick={() => restore(selected.id)}
                      className="px-3 py-1.5 border rounded-lg bg-gray-50 hover:bg-gray-100 text-sm"
                    >
                      Restore
                    </button>
                  )}
                </div>
              </div>
              {selected.attachments && selected.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 border-b px-5 py-3">
                  {selected.attachments.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1 border px-2 py-1 rounded-full text-xs"
                    >
                      <Paperclip className="h-3 w-3" />
                      <span>{a.name}</span>
                      {a.sizeKB ? (
                        <span className="text-gray-500">• {a.sizeKB} KB</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
              <div className="p-5 overflow-y-auto flex-1 read-prose" dangerouslySetInnerHTML={{ __html: selected.body }} />
              <div className="mt-auto border-t bg-gray-50 px-5 py-3 text-sm text-gray-600 space-y-1">
                <div>
                  <span className="font-medium text-gray-800">To:</span>{' '}
                  {selected.to.map((p) => `${p.name} <${p.email}>`).join(', ')}
                </div>
                {selected.cc && selected.cc.length > 0 && (
                  <div>
                    <span className="font-medium text-gray-800">Cc:</span>{' '}
                    {selected.cc.map((p) => `${p.name} <${p.email}>`).join(', ')}
                  </div>
                )}
              </div>
            </article>
          )}
        </section>
      </main>

      {/* Modal overlay for import/export */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full">
            <div className="flex justify-between items-start border-b p-4">
              <div>
                <h3 className="font-semibold">Import or Export Scenario JSON</h3>
                <p className="text-sm text-gray-500">
                  Paste an array of <code>Email</code> objects below, or export current. Data is saved to your
                  browser.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="px-2 py-1 border rounded-lg hover:bg-gray-100 text-sm"
              >
                Close
              </button>
            </div>
            <div className="p-4 space-y-3">
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                className="w-full h-64 border rounded-lg p-2 font-mono text-xs resize-y"
              ></textarea>
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <button
                    onClick={importJSON}
                    className="flex items-center gap-1 px-3 py-1.5 border rounded-lg bg-blue-500 text-white hover:bg-blue-600 text-sm"
                  >
                    <Upload className="h-4 w-4" /> Import JSON
                  </button>
                    
                  <button
                    onClick={exportJSON}
                    className="flex items-center gap-1 px-3 py-1.5 border rounded-lg bg-gray-50 hover:bg-gray-100 text-sm"
                  >
                    <Download className="h-4 w-4" /> Export current
                  </button>
                </div>
                <button
                  onClick={resetSample}
                  className="flex items-center gap-1 px-3 py-1.5 border rounded-lg bg-gray-50 hover:bg-gray-100 text-sm text-red-600"
                >
                  <RefreshCw className="h-4 w-4" /> Reset sample
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}