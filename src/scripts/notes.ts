interface Note {
  id: string;
  title: string;
  body: string;
  tags: string[];
  mood: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'shiguang-notes-v1';

function initNotes() {
  const form = document.querySelector<HTMLFormElement>('[data-note-form]');
  const list = document.querySelector<HTMLElement>('[data-notes-list]');
  if (!form || !list) return;

  const titleInput = form.elements.namedItem('title') as HTMLInputElement;
  const bodyInput = form.elements.namedItem('body') as HTMLTextAreaElement;
  const tagsInput = form.elements.namedItem('tags') as HTMLInputElement;
  const moodInput = form.elements.namedItem('mood') as HTMLSelectElement;
  const status = document.querySelector<HTMLElement>('[data-save-status]')!;
  const empty = document.querySelector<HTMLElement>('[data-notes-empty]')!;
  const count = document.querySelector<HTMLElement>('[data-notes-count]')!;
  const exportAll = document.querySelector<HTMLButtonElement>('[data-export-all]')!;
  const newButton = document.querySelector<HTMLButtonElement>('[data-new-note]')!;
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  let notes: Note[] = [];
  let editingId: string | null = null;
  let saveTimer: ReturnType<typeof setTimeout> | undefined;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    notes = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(notes)) notes = [];
  } catch {
    status.textContent = '无法读取本地便签，请检查浏览器存储权限。';
  }

  const persist = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  };

  const showStatus = (message: string) => { status.textContent = message; };

  const noteMarkdown = (note: Note) => {
    const title = note.title.replaceAll('"', '\\"');
    return `---\ntitle: "${title}"\ncreatedAt: ${note.createdAt}\nupdatedAt: ${note.updatedAt}\nmood: ${note.mood}\ntags: [${note.tags.map((tag) => `"${tag.replaceAll('"', '\\"')}"`).join(', ')}]\n---\n\n${note.body}\n`;
  };

  const download = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const clearForm = () => {
    if (saveTimer) clearTimeout(saveTimer);
    editingId = null;
    form.reset();
    submit.textContent = '收好这张便签';
    showStatus('新便签将在输入后自动保存。');
    titleInput.focus();
  };

  const editNote = (note: Note) => {
    editingId = note.id;
    titleInput.value = note.title;
    bodyInput.value = note.body;
    tagsInput.value = note.tags.join('，');
    moodInput.value = note.mood;
    submit.textContent = '更新这张便签';
    showStatus(`正在编辑 ${new Date(note.updatedAt).toLocaleString('zh-CN')} 的便签。`);
    form.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    bodyInput.focus();
  };

  const actionButton = (label: string, action: () => void) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'text-button';
    button.textContent = label;
    button.addEventListener('click', action);
    return button;
  };

  const render = () => {
    list.replaceChildren();
    notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    count.textContent = `${notes.length} 张便签`;
    empty.hidden = notes.length > 0;
    exportAll.disabled = notes.length === 0;

    for (const note of notes) {
      const card = document.createElement('article');
      card.className = 'note-card';
      const head = document.createElement('div');
      head.className = 'note-card__head';
      const mood = document.createElement('span');
      mood.textContent = `心情 / ${note.mood || '未命名'}`;
      const time = document.createElement('time');
      time.dateTime = note.updatedAt;
      time.textContent = new Date(note.updatedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      head.append(mood, time);
      const heading = document.createElement('h3');
      heading.textContent = note.title || '无题便签';
      const body = document.createElement('p');
      body.className = 'note-card__body';
      body.textContent = note.body;
      const tags = document.createElement('div');
      tags.className = 'tag-list';
      for (const tag of note.tags) {
        const item = document.createElement('span');
        item.className = 'tag';
        item.textContent = `#${tag}`;
        tags.append(item);
      }
      const actions = document.createElement('div');
      actions.className = 'note-card__actions';
      actions.append(
        actionButton('编辑', () => editNote(note)),
        actionButton('导出', () => download(`${note.title || '无题便签'}.md`, noteMarkdown(note))),
        actionButton('删除', () => {
          if (!confirm(`确定删除「${note.title || '无题便签'}」吗？此操作无法撤销。`)) return;
          notes = notes.filter((item) => item.id !== note.id);
          persist();
          if (editingId === note.id) clearForm();
          render();
          showStatus('便签已删除。');
        }),
      );
      card.append(head, heading, body, tags, actions);
      list.append(card);
    }
  };

  const save = () => {
    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();
    if (!title && !body) {
      showStatus('先写下一个词，也可以。');
      return;
    }
    try {
      const now = new Date().toISOString();
      const existing = notes.find((note) => note.id === editingId);
      if (existing) {
        Object.assign(existing, {
          title,
          body,
          tags: tagsInput.value.split(/[,，#]/).map((tag) => tag.trim()).filter(Boolean),
          mood: moodInput.value,
          updatedAt: now,
        });
      } else {
        const note: Note = {
          id: crypto.randomUUID(),
          title,
          body,
          tags: tagsInput.value.split(/[,，#]/).map((tag) => tag.trim()).filter(Boolean),
          mood: moodInput.value,
          createdAt: now,
          updatedAt: now,
        };
        notes.unshift(note);
        editingId = note.id;
        submit.textContent = '更新这张便签';
      }
      persist();
      render();
      showStatus(`已自动保存 · ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`);
    } catch {
      showStatus('保存失败：浏览器存储空间不足或已被禁用，请先导出便签。');
    }
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (saveTimer) clearTimeout(saveTimer);
    save();
  });
  form.addEventListener('input', () => {
    if (saveTimer) clearTimeout(saveTimer);
    showStatus('正在记下…');
    saveTimer = setTimeout(save, 650);
  });
  newButton.addEventListener('click', clearForm);
  exportAll.addEventListener('click', () => {
    if (!notes.length) return;
    const content = notes.map(noteMarkdown).join('\n---\n\n');
    download(`拾光集-便签-${new Date().toISOString().slice(0, 10)}.md`, content);
  });
  render();
}

initNotes();
