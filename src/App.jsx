import { useState, useEffect, useRef } from 'react'
import { supabase, getAllContacts } from './supabase'

const potentialColor = { 'Высокий': '#16a34a', 'Средний': '#d97706', 'Низкий': '#6b7280' }
const potentialOrder = { 'Высокий': 0, 'Средний': 1, 'Низкий': 2 }
const PRESET_TAGS = ['IT', 'Финансы', 'Строительство', 'Госсектор', 'Медиа', 'Недвижимость', 'Логистика', 'Авто', 'Инвестор', 'Юрист', 'Госсвязи']

function parseVcf(text) {
  const contacts = []
  const cards = text.split(/BEGIN:VCARD/i).filter(c => c.trim())
  for (const card of cards) {
    const getName = () => {
      const fn = card.match(/FN[^:]*:(.+)/i)
      if (fn) return fn[1].trim()
      const n = card.match(/^N[^:]*:(.+)/im)
      if (n) return n[1].replace(/;/g, ' ').trim()
      return null
    }
    const name = getName()
    if (!name) continue
    const org = card.match(/ORG[^:]*:(.+)/i)?.[1]?.replace(/;/g, ' ').trim() || ''
    const title = card.match(/TITLE[^:]*:(.+)/i)?.[1]?.trim() || ''
    const sphere = [title, org].filter(Boolean).join(', ')
    contacts.push({ name, type: '', sphere, frequency: 'Редко', potential: sphere ? 'Средний' : 'Низкий', notes: '', gives: '', needs: '', tags: [] })
  }
  return contacts
}

const emptyForm = { name: '', type: '', sphere: '', frequency: 'Периодически', potential: 'Средний', notes: '', gives: '', needs: '', tags: [] }

function TagInput({ tags, setTags }) {
  const [input, setInput] = useState('')
  const add = (tag) => { const t = tag.trim(); if (t && !tags.includes(t)) setTags([...tags, t]); setInput('') }
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
        {PRESET_TAGS.map(t => (
          <span key={t} onClick={() => add(t)} style={{ padding: '3px 8px', fontSize: 11, borderRadius: 12, cursor: 'pointer', background: tags.includes(t) ? '#111' : '#f0f0f0', color: tags.includes(t) ? '#fff' : '#555' }}>{t}</span>
        ))}
      </div>
      <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && add(input)}
        placeholder="Свой тэг + Enter"
        style={{ width: '100%', padding: '6px 10px', fontSize: 13, border: '1px solid #ddd', borderRadius: 8, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 4 }} />
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {tags.map(t => (
            <span key={t} style={{ padding: '3px 8px', fontSize: 11, borderRadius: 12, background: '#111', color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}>
              {t} <span onClick={() => setTags(tags.filter(x => x !== t))} style={{ cursor: 'pointer', opacity: 0.6 }}>×</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function ContactForm({ form, setForm, onSave, onCancel, title }) {
  const inp = { width: '100%', padding: '8px 10px', fontSize: 14, border: '1px solid #ddd', borderRadius: 8, boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 4 }
  const label = { fontSize: 12, color: '#888', marginBottom: 2, display: 'block' }
  return (
    <div style={{ padding: 16, border: '1px solid #eee', borderRadius: 10, marginBottom: 16 }}>
      <strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>{title}</strong>
      <label style={label}>Имя *</label>
      <input placeholder="Иван Иванов" value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={inp} />
      <label style={label}>Тип отношений</label>
      <input placeholder="Друг, Коллега, Клиент..." value={form.type} onChange={e => setForm({...form, type: e.target.value})} style={inp} />
      <label style={label}>Должность / Чем занимается</label>
      <input placeholder="CEO в TechCorp" value={form.sphere} onChange={e => setForm({...form, sphere: e.target.value})} style={inp} />
      <label style={label}>Что может дать вам</label>
      <input placeholder="Выход на инвесторов..." value={form.gives} onChange={e => setForm({...form, gives: e.target.value})} style={inp} />
      <label style={label}>Что ему может быть нужно</label>
      <input placeholder="Новые клиенты..." value={form.needs} onChange={e => setForm({...form, needs: e.target.value})} style={inp} />
      <label style={label}>Заметки</label>
      <input placeholder="Любая полезная информация" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} style={inp} />
      <label style={label}>Частота общения</label>
      <select value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})} style={{...inp, marginBottom: 8}}>
        <option>Активно</option><option>Периодически</option><option>Редко</option>
      </select>
      <label style={label}>Потенциал</label>
      <select value={form.potential} onChange={e => setForm({...form, potential: e.target.value})} style={{...inp, marginBottom: 8}}>
        <option>Высокий</option><option>Средний</option><option>Низкий</option>
      </select>
      <label style={label}>Тэги</label>
      <TagInput tags={form.tags || []} setTags={t => setForm({...form, tags: t})} />
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={onSave} style={{ flex: 1, padding: 10, background: '#111', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>Сохранить</button>
        <button onClick={onCancel} style={{ flex: 1, padding: 10, background: '#fff', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>Отмена</button>
      </div>
    </div>
  )
}

function RelationshipForm({ contactId, contacts, onSave, onClose }) {
  const [toId, setToId] = useState('')
  const [strength, setStrength] = useState(3)
  const [notes, setNotes] = useState('')
  const [search, setSearch] = useState('')

  const filtered = contacts.filter(c => c.id !== contactId && c.name.toLowerCase().includes(search.toLowerCase())).slice(0, 20)

  const save = async () => {
    if (!toId) return
    await supabase.from('relationships').insert([{ contact_from: contactId, contact_to: toId, strength, notes }])
    onSave()
    onClose()
  }

  return (
    <div style={{ padding: 16, background: '#f8f8f8', borderRadius: 10, marginTop: 8 }}>
      <strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>Добавить связь</strong>
      <input value={search} onChange={e => { setSearch(e.target.value); setToId('') }}
        placeholder="Найти контакт..."
        style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid #ddd', borderRadius: 8, boxSizing: 'border-box', marginBottom: 6, fontFamily: 'inherit' }} />
      {search && (
        <div style={{ border: '1px solid #eee', borderRadius: 8, marginBottom: 8, maxHeight: 150, overflowY: 'auto' }}>
          {filtered.map(c => (
            <div key={c.id} onClick={() => { setToId(c.id); setSearch(c.name) }}
              style={{ padding: '7px 10px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f0f0f0', background: toId === c.id ? '#f0f0f0' : '#fff' }}>
              {c.name} · {c.sphere?.slice(0, 40)}
            </div>
          ))}
        </div>
      )}
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: '#888' }}>Сила связи: {strength}/5</span>
        <input type="range" min="1" max="5" value={strength} onChange={e => setStrength(+e.target.value)}
          style={{ width: '100%', marginTop: 4 }} />
      </div>
      <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Заметка о связи"
        style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid #ddd', borderRadius: 8, boxSizing: 'border-box', marginBottom: 8, fontFamily: 'inherit' }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={save} style={{ flex: 1, padding: 8, background: '#111', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Сохранить</button>
        <button onClick={onClose} style={{ flex: 1, padding: 8, background: '#fff', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Отмена</button>
      </div>
    </div>
  )
}

function App() {
  const [contacts, setContacts] = useState([])
  const [relationships, setRelationships] = useState([])
  const [problem, setProblem] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editContact, setEditContact] = useState(null)
  const [showRelForm, setShowRelForm] = useState(null)
  const [expandedContact, setExpandedContact] = useState(null)
  const [search, setSearch] = useState('')
  const [filterPotential, setFilterPotential] = useState('Все')
  const [filterTag, setFilterTag] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editForm, setEditForm] = useState(emptyForm)
  const fileRef = useRef()

  useEffect(() => { loadContacts(); loadRelationships() }, [])

  const loadContacts = async () => {
    const data = await getAllContacts()
    if (data) setContacts(data.sort((a, b) => potentialOrder[a.potential] - potentialOrder[b.potential]))
  }

  const loadRelationships = async () => {
    const { data } = await supabase.from('relationships').select('*')
    if (data) setRelationships(data)
  }

  const handleVcf = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImporting(true)
    const text = await file.text()
    const parsed = parseVcf(text)
    for (let i = 0; i < parsed.length; i += 100) {
      await supabase.from('contacts').insert(parsed.slice(i, i + 100))
    }
    await loadContacts()
    setImporting(false)
    alert(`Импортировано ${parsed.length} контактов!`)
    e.target.value = ''
  }

  const addContact = async () => {
    if (!form.name.trim()) return
    await supabase.from('contacts').insert([form])
    setForm(emptyForm); setShowForm(false); loadContacts()
  }

  const saveEdit = async () => {
    if (!editForm.name.trim()) return
    await supabase.from('contacts').update(editForm).eq('id', editContact.id)
    setEditContact(null); loadContacts()
  }

  const deleteContact = async (id) => {
    await supabase.from('contacts').delete().eq('id', id)
    loadContacts()
  }

  const deleteRelationship = async (id) => {
    await supabase.from('relationships').delete().eq('id', id)
    loadRelationships()
  }

  const startEdit = (c) => {
    setEditContact(c)
    setEditForm({ name: c.name, type: c.type || '', sphere: c.sphere || '', frequency: c.frequency || 'Периодически', potential: c.potential || 'Средний', notes: c.notes || '', gives: c.gives || '', needs: c.needs || '', tags: c.tags || [] })
  }

  const getContactRels = (id) => {
    const rels = relationships.filter(r => r.contact_from === id || r.contact_to === id)
    return rels.map(r => {
      const otherId = r.contact_from === id ? r.contact_to : r.contact_from
      const other = contacts.find(c => c.id === otherId)
      return { ...r, other }
    }).filter(r => r.other)
  }

  const scoreContact = (c, problem) => {
    const p = problem.toLowerCase()
    let score = 0
    if (c.potential === 'Высокий') score += 40
    else if (c.potential === 'Средний') score += 20
    if (c.frequency === 'Активно') score += 20
    else if (c.frequency === 'Периодически') score += 10
    const rels = relationships.filter(r => r.contact_from === c.id || r.contact_to === c.id)
    score += rels.reduce((s, r) => s + r.strength, 0) * 2
    const fields = [c.sphere, c.gives, c.notes, c.tags?.join(' ')].join(' ').toLowerCase()
    p.split(' ').filter(w => w.length > 3).forEach(w => { if (fields.includes(w)) score += 15 })
    return score
  }

  const analyze = async () => {
    if (!problem.trim() || contacts.length === 0) return
    setLoading(true); setResult('')
    const scored = contacts.map(c => ({ ...c, score: scoreContact(c, problem) })).sort((a, b) => b.score - a.score).slice(0, 80)
    const contactsList = scored.map(c => {
      const rels = getContactRels(c.id)
      const relStr = rels.length ? ` Связан с: ${rels.map(r => `${r.other.name} (сила ${r.strength})`).join(', ')}.` : ''
      return `- ${c.name} (${c.type}): ${c.sphere}. Общение: ${c.frequency}. Потенциал: ${c.potential}. Score: ${c.score}.${relStr}${c.tags?.length ? ' Тэги: ' + c.tags.join(', ') : ''}${c.notes ? ' Заметка: ' + c.notes : ''}${c.gives ? ' Даёт: ' + c.gives : ''}`
    }).join('\n')
    const prompt = `Ты помогаешь предпринимателю из Казахстана найти нужных людей в его сети.\n\nЗадача: ${problem}\n\nКонтакты (отсортированы по релевантности):\n${contactsList}\n\nВыбери топ-3. Для каждого: почему он, как зайти (напрямую или через кого из списка), что конкретно сказать. На русском, кратко.`
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}` },
        body: JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'user', content: prompt }], max_tokens: 1200 })
      })
      const data = await response.json()
      setResult(data.choices[0].message.content)
    } catch (err) { setResult('Ошибка: ' + err.message) }
    setLoading(false)
  }

  const share = () => {
    if (!result) return
    const text = `Задача: ${problem}\n\n${result}`
    if (navigator.share) navigator.share({ title: 'ProblemSolver', text })
    else { navigator.clipboard.writeText(text); alert('Скопировано') }
  }

  const allTags = [...new Set(contacts.flatMap(c => c.tags || []))].sort()
  const filteredContacts = contacts
    .filter(c => filterPotential === 'Все' || c.potential === filterPotential)
    .filter(c => !filterTag || (c.tags || []).includes(filterTag))
    .filter(c => { const q = search.toLowerCase(); return !q || c.name?.toLowerCase().includes(q) || c.sphere?.toLowerCase().includes(q) || c.type?.toLowerCase().includes(q) })

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px', fontFamily: '-apple-system, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>🧠 ProblemSolver</h1>
      <p style={{ color: '#666', marginBottom: 20, fontSize: 14 }}>{contacts.length} контактов · {relationships.length} связей</p>

      <textarea value={problem} onChange={e => setProblem(e.target.value)}
        placeholder="Например: Нужен инвестор для IT стартапа в Казахстане"
        style={{ width: '100%', height: 110, padding: 12, fontSize: 15, border: '1.5px solid #ddd', borderRadius: 10, resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />

      <button onClick={analyze} disabled={loading || !problem.trim()}
        style={{ width: '100%', padding: 14, fontSize: 16, fontWeight: 600, background: loading ? '#999' : '#111', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', marginTop: 10 }}>
        {loading ? '⏳ Анализирую...' : '🔍 Найти нужных людей'}
      </button>

      {result && (
        <div style={{ marginTop: 20, padding: 16, background: '#f8f8f8', borderRadius: 10 }}>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6 }}>{result}</div>
          <button onClick={share} style={{ marginTop: 12, padding: '8px 16px', fontSize: 13, background: '#fff', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer' }}>📤 Поделиться</button>
        </div>
      )}

      <div style={{ marginTop: 30 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: '#999' }}>Контакты ({filteredContacts.length})</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => fileRef.current.click()} disabled={importing}
              style={{ padding: '6px 14px', fontSize: 13, background: '#fff', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer' }}>
              {importing ? '⏳' : '📥'} Импорт
            </button>
            <button onClick={() => setShowForm(!showForm)}
              style={{ padding: '6px 14px', fontSize: 13, background: '#111', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              + Добавить
            </button>
          </div>
        </div>

        <input ref={fileRef} type="file" accept=".vcf" onChange={handleVcf} style={{ display: 'none' }} />

        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔎 Поиск по имени, компании, сфере..."
          style={{ width: '100%', padding: '9px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 8, boxSizing: 'border-box', marginBottom: 10, fontFamily: 'inherit' }} />

        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          {['Все', 'Высокий', 'Средний', 'Низкий'].map(p => (
            <button key={p} onClick={() => setFilterPotential(p)}
              style={{ padding: '5px 12px', fontSize: 12, borderRadius: 20, border: '1px solid #ddd', cursor: 'pointer', background: filterPotential === p ? '#111' : '#fff', color: filterPotential === p ? '#fff' : '#333' }}>
              {p}
            </button>
          ))}
        </div>

        {allTags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            <span onClick={() => setFilterTag('')} style={{ padding: '4px 10px', fontSize: 11, borderRadius: 12, cursor: 'pointer', background: !filterTag ? '#111' : '#f0f0f0', color: !filterTag ? '#fff' : '#555' }}>Все тэги</span>
            {allTags.map(t => (
              <span key={t} onClick={() => setFilterTag(t === filterTag ? '' : t)}
                style={{ padding: '4px 10px', fontSize: 11, borderRadius: 12, cursor: 'pointer', background: filterTag === t ? '#111' : '#f0f0f0', color: filterTag === t ? '#fff' : '#555' }}>
                {t}
              </span>
            ))}
          </div>
        )}

        {showForm && <ContactForm form={form} setForm={setForm} onSave={addContact} onCancel={() => setShowForm(false)} title="Новый контакт" />}

        {filteredContacts.map(c => {
          const rels = getContactRels(c.id)
          const isExpanded = expandedContact === c.id
          return (
            <div key={c.id}>
              {editContact?.id === c.id ? (
                <ContactForm form={editForm} setForm={setEditForm} onSave={saveEdit} onCancel={() => setEditContact(null)} title="Редактировать контакт" />
              ) : (
                <div style={{ marginBottom: 8, border: '1px solid #eee', borderRadius: 8, fontSize: 13, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ cursor: 'pointer' }} onClick={() => setExpandedContact(isExpanded ? null : c.id)}>{c.name}</strong>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span style={{ color: potentialColor[c.potential], fontSize: 12 }}>● {c.potential}</span>
                        <span onClick={() => setShowRelForm(showRelForm === c.id ? null : c.id)} style={{ cursor: 'pointer', fontSize: 13 }} title="Добавить связь">🔗</span>
                        <span onClick={() => startEdit(c)} style={{ cursor: 'pointer', color: '#aaa', fontSize: 13 }}>✏️</span>
                        <span onClick={() => deleteContact(c.id)} style={{ cursor: 'pointer', color: '#ccc', fontSize: 16 }}>×</span>
                      </div>
                    </div>
                    <div style={{ color: '#555', marginTop: 2 }}>{c.type} · {c.frequency}</div>
                    <div style={{ color: '#777', marginTop: 4 }}>{c.sphere}</div>
                    {c.tags?.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                        {c.tags.map(t => <span key={t} style={{ padding: '2px 8px', fontSize: 11, borderRadius: 10, background: '#f0f0f0', color: '#555' }}>{t}</span>)}
                      </div>
                    )}
                    {rels.length > 0 && (
                      <div style={{ marginTop: 6, fontSize: 12, color: '#888' }}>
                        🔗 {rels.map(r => r.other.name).join(', ')}
                      </div>
                    )}
                  </div>

                  {isExpanded && rels.length > 0 && (
                    <div style={{ borderTop: '1px solid #f0f0f0', padding: '8px 12px', background: '#fafafa' }}>
                      <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Связи:</div>
                      {rels.map(r => (
                        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                          <div>
                            <span style={{ fontWeight: 600 }}>{r.other.name}</span>
                            <span style={{ color: '#888', marginLeft: 6 }}>{'★'.repeat(r.strength)}{'☆'.repeat(5 - r.strength)}</span>
                            {r.notes && <span style={{ color: '#999', marginLeft: 6 }}>{r.notes}</span>}
                          </div>
                          <span onClick={() => deleteRelationship(r.id)} style={{ cursor: 'pointer', color: '#ccc' }}>×</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {showRelForm === c.id && (
                    <div style={{ padding: '0 12px 12px' }}>
                      <RelationshipForm contactId={c.id} contacts={contacts} onSave={loadRelationships} onClose={() => setShowRelForm(null)} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {filteredContacts.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999', padding: 20, fontSize: 14 }}>Ничего не найдено</div>
        )}
      </div>
    </div>
  )
}

export default App
