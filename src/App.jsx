import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'

function App() {
  const [todos, setTodos] = useState(() => {
    const saved = localStorage.getItem('todos')
    return saved ? JSON.parse(saved) : []
  })
  const [input, setInput] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [category, setCategory] = useState('personal')
  const [priority, setPriority] = useState('medium')
  const [filter, setFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [streak, setStreak] = useState(() => {
    const saved = localStorage.getItem('streak')
    return saved ? JSON.parse(saved) : { count: 0, lastDate: null }
  })
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark'
  })
  const [dragId, setDragId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [editExpanded, setEditExpanded] = useState(null)
  const dragNode = useRef(null)
  const editInputRef = useRef(null)

  const categories = {
    personal: { label: 'Personal', color: '#667eea' },
    work: { label: 'Work', color: '#f59e0b' },
    shopping: { label: 'Shopping', color: '#10b981' },
    health: { label: 'Health', color: '#ef4444' },
    finance: { label: 'Finance', color: '#8b5cf6' },
    education: { label: 'Education', color: '#3b82f6' },
    errands: { label: 'Errands', color: '#f97316' },
    social: { label: 'Social', color: '#ec4899' },
  }

  const priorities = {
    low: { label: 'Low', color: '#94a3b8', icon: '\u25CB' },
    medium: { label: 'Medium', color: '#3b82f6', icon: '\u25D1' },
    high: { label: 'High', color: '#f59e0b', icon: '\u25C9' },
    urgent: { label: 'Urgent', color: '#ef4444', icon: '\u25CF' },
  }

  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos))
  }, [todos])

  useEffect(() => {
    localStorage.setItem('streak', JSON.stringify(streak))
  }, [streak])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  const updateStreak = useCallback(() => {
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()
    setStreak(prev => {
      if (prev.lastDate === today) return prev
      if (prev.lastDate === yesterday) {
        return { count: prev.count + 1, lastDate: today }
      }
      return { count: 1, lastDate: today }
    })
  }, [])

  const addTodo = () => {
    const text = input.trim()
    if (!text) return
    const dueDatetime = dueDate ? new Date(`${dueDate}T${dueTime || '23:59'}`).toISOString() : null
    setTodos([...todos, {
      id: Date.now(), text, completed: false,
      createdAt: new Date().toISOString(), dueAt: dueDatetime,
      category, priority, subtasks: []
    }])
    setInput('')
    setDueDate('')
    setDueTime('')
    setCategory('personal')
    setPriority('medium')
  }

  const toggleTodo = (id) => {
    setTodos(todos.map(t => {
      if (t.id === id) {
        const toggled = { ...t, completed: !t.completed }
        if (toggled.completed) updateStreak()
        return toggled
      }
      return t
    }))
  }

  const deleteTodo = (id) => {
    setTodos(todos.filter(t => t.id !== id))
    if (editExpanded === id) setEditExpanded(null)
  }

  const clearCompleted = () => {
    setTodos(todos.filter(t => !t.completed))
  }

  // Inline editing
  const startEditing = (todo) => {
    setEditingId(todo.id)
    setEditText(todo.text)
  }

  const saveEdit = (id) => {
    const trimmed = editText.trim()
    if (trimmed) {
      setTodos(todos.map(t => t.id === id ? { ...t, text: trimmed } : t))
    }
    setEditingId(null)
    setEditText('')
  }

  const updateTodoField = (id, field, value) => {
    setTodos(todos.map(t => t.id === id ? { ...t, [field]: value } : t))
  }

  // Subtasks
  const addSubtask = (todoId, text) => {
    if (!text.trim()) return
    setTodos(todos.map(t => {
      if (t.id === todoId) {
        const subtasks = [...(t.subtasks || []), { id: Date.now(), text: text.trim(), completed: false }]
        return { ...t, subtasks }
      }
      return t
    }))
  }

  const toggleSubtask = (todoId, subtaskId) => {
    setTodos(todos.map(t => {
      if (t.id === todoId) {
        const subtasks = (t.subtasks || []).map(s =>
          s.id === subtaskId ? { ...s, completed: !s.completed } : s
        )
        return { ...t, subtasks }
      }
      return t
    }))
  }

  const deleteSubtask = (todoId, subtaskId) => {
    setTodos(todos.map(t => {
      if (t.id === todoId) {
        const subtasks = (t.subtasks || []).filter(s => s.id !== subtaskId)
        return { ...t, subtasks }
      }
      return t
    }))
  }

  // Export & Import
  const exportTodos = () => {
    const data = JSON.stringify({ todos, streak }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `todos-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importTodos = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (data.todos && Array.isArray(data.todos)) {
          setTodos(data.todos)
          if (data.streak) setStreak(data.streak)
        }
      } catch {
        alert('Invalid file format')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // Drag and drop
  const handleDragStart = (e, id) => {
    setDragId(id)
    dragNode.current = e.target.closest('li')
    setTimeout(() => {
      if (dragNode.current) dragNode.current.classList.add('dragging')
    }, 0)
  }

  const handleDragOver = (e, targetId) => {
    e.preventDefault()
    if (dragId === targetId) return
    setTodos(prev => {
      const dragIndex = prev.findIndex(t => t.id === dragId)
      const targetIndex = prev.findIndex(t => t.id === targetId)
      if (dragIndex === -1 || targetIndex === -1) return prev
      const updated = [...prev]
      const [dragged] = updated.splice(dragIndex, 1)
      updated.splice(targetIndex, 0, dragged)
      return updated
    })
  }

  const handleDragEnd = () => {
    if (dragNode.current) dragNode.current.classList.remove('dragging')
    setDragId(null)
    dragNode.current = null
  }

  // Filtering
  const filteredTodos = todos.filter(t => {
    if (filter === 'active' && t.completed) return false
    if (filter === 'completed' && !t.completed) return false
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false
    if (search && !t.text.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const remaining = todos.filter(t => !t.completed).length
  const completedCount = todos.filter(t => t.completed).length
  const progressPercent = todos.length > 0 ? Math.round((completedCount / todos.length) * 100) : 0

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  const formatDate = (isoString) => {
    if (!isoString) return ''
    const date = new Date(isoString)
    return date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    }) + ' at ' + date.toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit'
    })
  }

  const isOverdue = (dueAt) => {
    if (!dueAt) return false
    return new Date(dueAt) < new Date()
  }

  return (
    <div className="app">
      <div className="app-header">
        <div className="header-top">
          <p className="greeting">{getGreeting()}</p>
          <div className="header-actions">
            <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle theme">
              {theme === 'dark' ? '\u2600' : '\u263D'}
            </button>
            <button className="export-btn" onClick={exportTodos} title="Export tasks">&#8681;</button>
            <label className="import-btn" title="Import tasks">
              &#8679;
              <input type="file" accept=".json" onChange={importTodos} hidden />
            </label>
          </div>
        </div>
        <h1>My To-Do List</h1>
        <div className="header-stats">
          <span>{remaining} pending</span>
          <span className="stat-divider">|</span>
          <span>{completedCount} done</span>
          {streak.count > 0 && (
            <>
              <span className="stat-divider">|</span>
              <span className="streak">{streak.count} day streak</span>
            </>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {todos.length > 0 && (
        <div className="progress-section">
          <div className="progress-info">
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="todo-input-area">
        <div className="input-row">
          <input
            type="text"
            placeholder="What needs to be done?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTodo()}
          />
          <button onClick={addTodo}>Add</button>
        </div>
        <div className="options-row">
          <div className="due-date-row">
            <label>Due:</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
          </div>
          <div className="category-row">
            <label>Type:</label>
            <div className="category-select-wrapper" style={{ '--cat-color': categories[category].color }}>
              <span className="category-dot" />
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {Object.entries(categories).map(([key, cat]) => (
                  <option key={key} value={key}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="options-row">
          <div className="priority-row">
            <label>Priority:</label>
            <div className="priority-select-wrapper" style={{ '--pri-color': priorities[priority].color }}>
              <span className="priority-icon">{priorities[priority].icon}</span>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                {Object.entries(priorities).map(([key, pri]) => (
                  <option key={key} value={key}>{pri.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="search-filter-bar">
        <div className="search-box">
          <span className="search-icon">&#128269;</span>
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')}>&times;</button>
          )}
        </div>
        <div className="filter-controls">
          <div className="filter-tabs">
            {['all', 'active', 'completed'].map(f => (
              <button
                key={f}
                className={filter === f ? 'active' : ''}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="category-filter">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">All Types</option>
              {Object.entries(categories).map(([key, cat]) => (
                <option key={key} value={key}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Todo List */}
      {filteredTodos.length === 0 ? (
        <div className="empty-state">
          <div className="icon">&#9745;</div>
          <p>{search ? 'No tasks match your search.' : filter === 'all' ? 'No tasks yet. Add one above!' : `No ${filter} tasks.`}</p>
        </div>
      ) : (
        <ul className="todo-list">
          {filteredTodos.map(todo => (
            <li
              key={todo.id}
              className={`${todo.completed ? 'completed' : ''} ${editExpanded === todo.id ? 'expanded' : ''}`}
              draggable={editingId !== todo.id}
              onDragStart={(e) => handleDragStart(e, todo.id)}
              onDragOver={(e) => handleDragOver(e, todo.id)}
              onDragEnd={handleDragEnd}
            >
              <div className="todo-main-row">
                <div className="drag-handle" title="Drag to reorder">&#8942;&#8942;</div>
                <div
                  className={`todo-checkbox ${todo.completed ? 'checked' : ''}`}
                  onClick={() => toggleTodo(todo.id)}
                />
                <div className="todo-content">
                  <div className="todo-top-row">
                    {editingId === todo.id ? (
                      <input
                        ref={editInputRef}
                        className="edit-input"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(todo.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        onBlur={() => saveEdit(todo.id)}
                      />
                    ) : (
                      <span
                        className="todo-text"
                        onDoubleClick={() => startEditing(todo)}
                        title="Double-click to edit"
                      >
                        {todo.text}
                      </span>
                    )}
                    {todo.priority && priorities[todo.priority] && (
                      <span
                        className={`priority-badge priority-${todo.priority}`}
                        style={{ '--pri-color': priorities[todo.priority].color }}
                      >
                        {priorities[todo.priority].icon} {priorities[todo.priority].label}
                      </span>
                    )}
                    {todo.category && categories[todo.category] && (
                      <span
                        className="category-badge"
                        style={{ '--cat-color': categories[todo.category].color }}
                      >
                        {categories[todo.category].label}
                      </span>
                    )}
                  </div>
                  <span className="todo-date">Added {formatDate(todo.createdAt)}</span>
                  {todo.dueAt && (
                    <span className={`todo-due ${!todo.completed && isOverdue(todo.dueAt) ? 'overdue' : ''}`}>
                      Due: {formatDate(todo.dueAt)}
                    </span>
                  )}
                  {/* Subtask count */}
                  {(todo.subtasks || []).length > 0 && (
                    <span className="subtask-count">
                      {(todo.subtasks || []).filter(s => s.completed).length}/{(todo.subtasks || []).length} subtasks
                    </span>
                  )}
                </div>
                <div className="todo-actions">
                  <button
                    className="todo-expand"
                    onClick={() => setEditExpanded(editExpanded === todo.id ? null : todo.id)}
                    title="Expand"
                  >
                    {editExpanded === todo.id ? '\u25B2' : '\u25BC'}
                  </button>
                  <button className="todo-delete" onClick={() => deleteTodo(todo.id)}>
                    &times;
                  </button>
                </div>
              </div>

              {/* Expanded edit panel */}
              {editExpanded === todo.id && (
                <div className="todo-expand-panel">
                  <div className="expand-row">
                    <label>Priority:</label>
                    <select
                      value={todo.priority || 'medium'}
                      onChange={(e) => updateTodoField(todo.id, 'priority', e.target.value)}
                    >
                      {Object.entries(priorities).map(([key, pri]) => (
                        <option key={key} value={key}>{pri.icon} {pri.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="expand-row">
                    <label>Category:</label>
                    <select
                      value={todo.category || 'personal'}
                      onChange={(e) => updateTodoField(todo.id, 'category', e.target.value)}
                    >
                      {Object.entries(categories).map(([key, cat]) => (
                        <option key={key} value={key}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="expand-row">
                    <label>Due date:</label>
                    <input
                      type="datetime-local"
                      value={todo.dueAt ? new Date(new Date(todo.dueAt).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                      onChange={(e) => updateTodoField(todo.id, 'dueAt', e.target.value ? new Date(e.target.value).toISOString() : null)}
                    />
                  </div>

                  {/* Subtasks */}
                  <div className="subtasks-section">
                    <label>Subtasks:</label>
                    <ul className="subtask-list">
                      {(todo.subtasks || []).map(sub => (
                        <li key={sub.id} className={sub.completed ? 'completed' : ''}>
                          <div
                            className={`subtask-checkbox ${sub.completed ? 'checked' : ''}`}
                            onClick={() => toggleSubtask(todo.id, sub.id)}
                          />
                          <span className="subtask-text">{sub.text}</span>
                          <button className="subtask-delete" onClick={() => deleteSubtask(todo.id, sub.id)}>&times;</button>
                        </li>
                      ))}
                    </ul>
                    <SubtaskInput onAdd={(text) => addSubtask(todo.id, text)} />
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {todos.length > 0 && (
        <div className="app-footer">
          <span>{remaining} item{remaining !== 1 ? 's' : ''} left</span>
          {todos.some(t => t.completed) && (
            <button className="clear-completed" onClick={clearCompleted}>
              Clear completed
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function SubtaskInput({ onAdd }) {
  const [text, setText] = useState('')
  return (
    <div className="subtask-input">
      <input
        type="text"
        placeholder="Add subtask..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && text.trim()) {
            onAdd(text)
            setText('')
          }
        }}
      />
      <button onClick={() => { if (text.trim()) { onAdd(text); setText('') } }}>+</button>
    </div>
  )
}

export default App
