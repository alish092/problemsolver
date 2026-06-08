import { useState } from 'react'

const CONTACTS = [
  { id: 1, name: 'Мухамед', type: 'Друг', sphere: 'Завод металлоконструкций, дир. филиала', frequency: 'Активно', gives: 'Поставщик металлоконструкций', needs: 'Новые каналы сбыта', potential: 'Высокий', notes: 'Агентское соглашение' },
  { id: 2, name: 'Жанель', type: 'Сестра', sphere: 'Проектировщик', frequency: 'Активно', gives: 'Закладывает поставщиков в смету', needs: '', potential: 'Высокий', notes: '' },
  { id: 3, name: 'Жабай', type: 'Однокурсник МВА', sphere: 'Строительная компания, север Казахстана', frequency: 'Периодически', gives: 'Генподрядчик', needs: 'Надёжные поставщики', potential: 'Высокий', notes: '' },
  { id: 4, name: 'Сергей Бобров', type: 'Друг', sphere: 'Дистрибьюторство спецтехники Magirus, высокий админрычаг', frequency: 'Активно', gives: '', needs: '', potential: 'Высокий', notes: '' },
  { id: 5, name: 'Марат Кокенов', type: 'Друг', sphere: 'Digital, телефония Novofon, медиапродакшн, грузоперевозки. Выход в Транстелеком на зампреда', frequency: 'Активно', gives: '', needs: '', potential: 'Высокий', notes: '' },
  { id: 6, name: 'Султан Сартаев', type: 'Друг', sphere: 'Сын генпрокурора, внук автора конституции РК. Сильный админресурс и финансы', frequency: 'Активно', gives: '', needs: '', potential: 'Высокий', notes: '' },
  { id: 7, name: 'Асан Ергалиев', type: 'Друг', sphere: 'PWC, Кулибаев. Антикризисный менеджер. Высокий админрычаг', frequency: 'Периодически', gives: '', needs: '', potential: 'Высокий', notes: '' },
  { id: 8, name: 'Юрий Тультаев', type: 'Друг', sphere: 'Партнёр Асана Ергалиева, инициативный', frequency: 'Активно', gives: '', needs: '', potential: 'Высокий', notes: '' },
  { id: 9, name: 'Мейржан Амиржанов', type: 'Друг', sphere: 'Forte Bank, Magnum, Sergek Group. Дата-анализ', frequency: 'Активно', gives: '', needs: '', potential: 'Высокий', notes: '' },
  { id: 10, name: 'Андрей Привальцев', type: 'Друг', sphere: 'Франшиза Этажи. Готов финансировать хорошие идеи', frequency: 'Активно', gives: '', needs: '', potential: 'Высокий', notes: '' },
  { id: 11, name: 'Нариман Куаншалиев', type: 'Друг', sphere: 'Директор Тойота. Сильный админрычаг, друг учредителей Orbis Kazakhstan', frequency: 'Активно', gives: '', needs: '', potential: 'Высокий', notes: '' },
  { id: 12, name: 'Айдар Кумаров', type: 'Дядя', sphere: 'Главный ревизор КТЖ. Высокий уровень админрычага', frequency: 'Редко', gives: '', needs: '', potential: 'Высокий', notes: '' },
  { id: 13, name: 'Женис Нуртасов', type: 'Друг', sphere: 'Закрытый поиск премиум недвижимости', frequency: 'Активно', gives: '', needs: '', potential: 'Высокий', notes: '' },
  { id: 14, name: 'Алмас', type: 'Друг', sphere: 'Chase Лондон. Финансы', frequency: 'Периодически', gives: '', needs: '', potential: 'Высокий', notes: '' },
  { id: 15, name: 'Жубаныш Байбатыров', type: 'Друг', sphere: 'Советник ERG. Не работает с откатами', frequency: 'Активно', gives: '', needs: '', potential: 'Средний', notes: '' },
  { id: 16, name: 'Куаныш Жанадилов', type: 'Коллега', sphere: 'Директор Мерседес центра, много связей', frequency: 'Периодически', gives: '', needs: '', potential: 'Средний', notes: '' },
  { id: 17, name: 'Диас Акимов', type: 'Друг', sphere: 'Поставки запчастей из Китая, эксклюзивный поставщик дилеров', frequency: 'Периодически', gives: '', needs: '', potential: 'Средний', notes: '' },
  { id: 18, name: 'Мансур', type: 'Друг', sphere: 'Частные джеты, послы и консулы', frequency: 'Периодически', gives: '', needs: '', potential: 'Низкий', notes: '' },
]

const potentialColor = { 'Высокий': '#16a34a', 'Средний': '#d97706', 'Низкий': '#6b7280' }

function App() {
  const [problem, setProblem] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const analyze = async () => {
    if (!problem.trim()) return
    setLoading(true)
    setResult('')
    const contactsList = CONTACTS.map(c =>
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

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px', fontFamily: '-apple-system, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>🧠 ProblemSolver</h1>
      <p style={{ color: '#666', marginBottom: 20, fontSize: 14 }}>{CONTACTS.length} контактов · Опиши задачу</p>
      <textarea value={problem} onChange={e => setProblem(e.target.value)}
        placeholder="Например: Нужен инвестор для IT стартапа в Казахстане"
        style={{ width: '100%', height: 110, padding: 12, fontSize: 15, border: '1.5px solid #ddd', borderRadius: 10, resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
      <button onClick={analyze} disabled={loading || !problem.trim()}
        style={{ width: '100%', padding: 14, fontSize: 16, fontWeight: 600, background: loading ? '#999' : '#111', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', marginTop: 10 }}>
        {loading ? '⏳ Анализирую...' : '🔍 Найти нужных людей'}
      </button>
      {result && <div style={{ marginTop: 20, padding: 16, background: '#f8f8f8', borderRadius: 10, whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6 }}>{result}</div>}
      <details style={{ marginTop: 30 }}>
        <summary style={{ cursor: 'pointer', color: '#999', fontSize: 13 }}>Все контакты ({CONTACTS.length})</summary>
        <div style={{ marginTop: 10 }}>
          {CONTACTS.map(c => (
            <div key={c.id} style={{ padding: '10px 12px', marginBottom: 8, border: '1px solid #eee', borderRadius: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{c.name}</strong>
                <span style={{ color: potentialColor[c.potential], fontSize: 12 }}>{c.potential}</span>
              </div>
              <div style={{ color: '#555', marginTop: 2 }}>{c.type} · {c.frequency}</div>
              <div style={{ color: '#777', marginTop: 4 }}>{c.sphere}</div>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}

export default App
