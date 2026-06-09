import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'

const potentialColor = { 'Высокий': '#16a34a', 'Средний': '#d97706', 'Низкий': '#6b7280' }
const potentialOrder = { 'Высокий': 0, 'Средний': 1, 'Низкий': 2 }

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
    const getOrg = () => {
      const org = card.match(/ORG[^:]*:(.+)/i)
      return org ? org[1].replace(/;/g, ' ').trim() : ''
    }
    const getTitle = () => {
      const title = card.match(/TITLE[^:]*:(.+)/i)
      return title ? title[1].trim() : ''
    }
    const name = getName()
    if (!name) continue
    const org = getOrg()
    const title = getTitle()
    const sphere = [title, org].filter(Boolean).join(', ')
    contacts.push({
      name,
      type: '',
      sphere,
      frequency: 'Редко',
      potential: sphere ? 'Средний' : 'Низкий',
      notes: '',
      gives: '',
      needs: ''
    })
  }
  return contacts
}

function App() {
  const [contacts, setContacts] = useState([])
  const [problem, setProblem] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [filterPotential, setFilterPotential] = useState('Все')
  const [form, setForm] = useState({ name: '', type: '', sphere: '', frequency: 'Периодически', potential: 'Средний', notes: '', gives: '', needs: '' })
  const fileRef = useRef()

  useEffect(() => { loadContacts() }, [])

  const loadContacts = async () => {
    const { data } = await supabase.from('contacts').select('*')
    if (data) setContacts(data.sort((a, b) => potentialOrder[a.potential] - potentialOrder[b.potential]))
  }

  const handleVcf = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImporting(true)
    const text = await file.text()
    const parsed = parseVcf(text)
    const chunkSize = 100
    for (let i = 0; i < parsed.length; i += chunkSize) {
      await supabase.from('contacts').insert(parsed.slice(i, i + chunkSize))
    }
    await loadContacts()
    setImporting(false)
    alert(`Импортировано ${parsed.length} контактов!`)
    e.target.value = ''
  }

  const addContact = async () => {
    if (!form.name.trim()) return
    await supabase.from('contacts').insert([form])
    setForm({ name: '', type: '', sphere: '', frequency: 'Периодически', potential: 'Средний', notes: '', gives: '', needs: '' })
    setShowForm(false)
    loadContacts()
  }

  const deleteContact = async (id) => {
    await supabase.from('contacts').delete().eq('id', id)
    loadContacts()
  }

  const filteredContacts = contacts
    .filter(c => filterPotential === 'Все' || c.potential === filterPotential)
    .filter(c => {
      const q = search.toLowerCase()
      return !q || c.name?.toLowerCase().includes(q) || c.sphere?.toLowerCase().includes(q) || c.type?.toLowerCase().includes(q)
    })

  const analyze = async () => {
    if (!problem.trim() || contacts.length === 0) return
    setLoading(true)
    setResult('')
    const top = contacts.filter(c => c.potential === 'Высокий').slice(0, 100)
    const rest = contacts.filter(c => c.potential !== 'Высокий').slice(0, 50)
    const pool = [...top, ...rest]
    const contactsList = pool.map(c =>
      `- ${c.name} (${c.type}): ${c.sphere}. Общение: ${c.frequency}. Потенциал: ${c.potential}.${c.notes ? ' Заметка: ' + c.notes : ''}${c.gives ? ' Даёт: ' + c.gives : ''}${c.needs ? ' Нужно: ' + c.needs : ''}`
    ).join('\n')
    const prompt = `Ты помогаешь предпринимателю из Казахстана найти нужных людей в его сети.\n\nЗадача: ${problem}\n\nКонтакты:\n${contactsList}\n\nВыбери топ-3. Для каждого: почему он, как зайти, что сказать. Кратко, по делу, на русском.`
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
    if (navigator.share) {
      navigator.share({ title: 'ProblemSolver', text })
    } else {
      navigator.clipboard.writeText(text)
      alert('Скопировано в буфер обмена')
    }
  }

  const inp = { width: '100%', padding: '8px 10px', fontSize: 14, border: '1px solid #ddd', borderRadius: 8, boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 4 }
  const label = { fontSize: 12, color: '#888', marginBottom: 2, display: 'block' }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px', fontFamily: '-apple-system, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>🧠 ProblemSolver</h1>
      <p style={{ color: '#666', marginBottom: 20, fontSize: 14 }}>{contacts.length} контактов · Опиши задачу</p>

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
          <button onClick={share} style={{ marginTop: 12, padding: '8px 16px', fontSize: 13, background: '#fff', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer' }}>
            📤 Поделиться
          </button>
        </div>
      )}

      <div style={{ marginTop: 30 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: '#999' }}>Контакты ({filteredContacts.length})</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => fileRef.current.click()} disabled={importing}
              style={{ padding: '6px 14px', fontSize: 13, background: '#fff', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer' }}>
              {importing ? '⏳ Импорт...' : '📥 Импорт vcf'}
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

        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {['Все', 'Высокий', 'Средний', 'Низкий'].map(p => (
            <button key={p} onClick={() => setFilterPotential(p)}
              style={{ padding: '5px 12px', fontSize: 12, borderRadius: 20, border: '1px solid #ddd', cursor: 'pointer', background: filterPotential === p ? '#111' : '#fff', color: filterPotential === p ? '#fff' : '#333' }}>
              {p}
            </button>
          ))}
        </div>

        {showForm && (
          <div style={{ padding: 16, border: '1px solid #eee', borderRadius: 10, marginBottom: 16 }}>
            <label style={label}>Имя *</label>
            <input placeholder="Иван Иванов" value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={inp} />
            <label style={label}>Тип отношений</label>
            <input placeholder="Друг, Коллега, Клиент, Партнёр..." value={form.type} onChange={e => setForm({...form, type: e.target.value})} style={inp} />
            <label style={label}>Должность / Чем занимается</label>
            <input placeholder="CEO в TechCorp, занимается логистикой" value={form.sphere} onChange={e => setForm({...form, sphere: e.target.value})} style={inp} />
            <label style={label}>Что может дать вам</label>
            <input placeholder="Выход на инвесторов, экспертиза в праве..." value={form.gives} onChange={e => setForm({...form, gives: e.target.value})} style={inp} />
            <label style={label}>Что ему может быть нужно</label>
            <input placeholder="Новые клиенты, партнёры..." value={form.needs} onChange={e => setForm({...form, needs: e.target.value})} style={inp} />
            <label style={label}>Заметки</label>
            <input placeholder="Любая полезная информация" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} style={inp} />
            <label style={label}>Частота общения</label>
            <select value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})} style={{...inp, marginBottom: 8}}>
              <option>Активно</option>
              <option>Периодически</option>
              <option>Редко</option>
            </select>
            <label style={label}>Потенциал контакта</label>
            <select value={form.potential} onChange={e => setForm({...form, potential: e.target.value})} style={{...inp, marginBottom: 12}}>
              <option>Высокий</option>
              <option>Средний</option>
              <option>Низкий</option>
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={addContact} style={{ flex: 1, padding: 10, background: '#111', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>Сохранить</button>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: 10, background: '#fff', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>Отмена</button>
            </div>
          </div>
        )}

        {filteredContacts.map(c => (
          <div key={c.id} style={{ padding: '10px 12px', marginBottom: 8, border: '1px solid #eee', borderRadius: 8, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{c.name}</strong>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: potentialColor[c.potential], fontSize: 12 }}>● {c.potential}</span>
                <span onClick={() => deleteContact(c.id)} style={{ cursor: 'pointer', color: '#ccc', fontSize: 16 }}>×</span>
              </div>
            </div>
            <div style={{ color: '#555', marginTop: 2 }}>{c.type} · {c.frequency}</div>
            <div style={{ color: '#777', marginTop: 4 }}>{c.sphere}</div>
          </div>
        ))}

        {filteredContacts.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999', padding: 20, fontSize: 14 }}>Ничего не найдено</div>
        )}
      </div>
    </div>
  )
}

export default App
