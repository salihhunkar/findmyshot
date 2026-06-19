# Frontend Geliştirme Rehberi

Next.js frontend'de yeni sayfa veya bileşen ekleme.

## Frontend Mimarisi

```
web/
├── app/                  # Next.js app directory (routes)
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   ├── admin/            # Admin bölümü
│   │   ├── page.tsx
│   │   └── login/page.tsx
│   ├── events/
│   │   ├── create/page.tsx
│   │   └── detail/page.tsx
│   └── ...
├── components/           # Reusable components
├── lib/                  # Utilities (API, helpers)
├── public/               # Static files
├── globals.css           # Global styles
├── package.json
└── tsconfig.json
```

## Sayfa Ekleme (Routes)

Next.js'de sayfalar `app/[path]/page.tsx` olarak oluşturulur.

### Basit Sayfa

**Dosya**: `web/app/my-page/page.tsx`

```typescript
'use client'

export default function MyPage() {
  return (
    <div className="container">
      <h1>My Page</h1>
      <p>This is a new page</p>
    </div>
  )
}
```

**Erişim**: `http://localhost:3000/my-page`

### Layout ile Sayfa

Eğer özel layout lazımsa:

**Dosya**: `web/app/my-feature/layout.tsx`

```typescript
import React from 'react'

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      <nav>My Feature Navigation</nav>
      <main>{children}</main>
    </div>
  )
}
```

**Dosya**: `web/app/my-feature/page.tsx`

```typescript
'use client'

export default function MyFeaturePage() {
  return <div>Feature content</div>
}
```

### Dynamic Parametreli Sayfa

**Dosya**: `web/app/events/[id]/page.tsx`

```typescript
'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Event {
  id: string
  name: string
  date: string
}

export default function EventDetailPage() {
  const params = useParams()
  const eventId = params.id as string
  
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/events/${eventId}`)
        if (!response.ok) throw new Error('Failed to fetch')
        const data = await response.json()
        setEvent(data.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    
    fetchEvent()
  }, [eventId])
  
  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!event) return <div>Event not found</div>
  
  return (
    <div>
      <h1>{event.name}</h1>
      <p>Date: {event.date}</p>
    </div>
  )
}
```

**Erişim**: `http://localhost:3000/events/liwa-fest`

## Bileşen Oluşturma

**Dosya**: `web/components/my-component.tsx`

```typescript
'use client'

import React from 'react'

interface MyComponentProps {
  title: string
  description?: string
  onAction?: () => void
}

export function MyComponent({
  title,
  description,
  onAction,
}: MyComponentProps) {
  return (
    <div className="my-component">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {onAction && (
        <button onClick={onAction}>
          Action
        </button>
      )}
    </div>
  )
}
```

### Bileşeni Sayfada Kullanma

```typescript
'use client'

import { MyComponent } from '@/components/my-component'

export default function Page() {
  const handleAction = () => {
    console.log('Action clicked')
  }
  
  return (
    <MyComponent
      title="My Title"
      description="My description"
      onAction={handleAction}
    />
  )
}
```

## State Yönetimi

### useState (Basit State)

```typescript
'use client'

import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  )
}
```

### useEffect (Side Effects)

```typescript
'use client'

import { useEffect, useState } from 'react'

export default function DataFetcher() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/data')
        const result = await response.json()
        setData(result)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, []) // Empty dependency = fetch once on mount
  
  if (loading) return <div>Loading...</div>
  return <div>{JSON.stringify(data)}</div>
}
```

## API Entegrasyonu

**Dosya**: `web/lib/api-client.ts`

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`)
  }
  
  return response.json()
}

// Örnek kullanımlar
export const api = {
  events: {
    getAll: () => apiCall('/api/events'),
    getOne: (id: string) => apiCall(`/api/events/${id}`),
    create: (data: any) => apiCall('/api/events', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },
  
  photos: {
    upload: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return fetch(`${API_BASE}/api/photos/upload`, {
        method: 'POST',
        body: formData,
      })
    },
  },
}
```

### Sayfada API Kullanma

```typescript
'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'

interface Event {
  id: string
  name: string
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await api.events.getAll()
        setEvents(data.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error')
      } finally {
        setLoading(false)
      }
    }
    
    fetchEvents()
  }, [])
  
  if (loading) return <div>Loading events...</div>
  if (error) return <div>Error: {error}</div>
  
  return (
    <div>
      <h1>Events ({events.length})</h1>
      {events.map(event => (
        <div key={event.id}>
          <h2>{event.name}</h2>
        </div>
      ))}
    </div>
  )
}
```

## TypeScript Types

Tüm bileşenler ve API responses'leri type'lanmalı:

```typescript
// Kullanıcı
interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'photographer' | 'guest'
}

// Etkinlik
interface Event {
  id: string
  name: string
  date: string
  materials?: EventMaterial[]
}

// Materyal
interface EventMaterial {
  id: string
  url: string
  type: 'image' | 'video'
  uploadedAt: string
}

// API Response
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
```

## Styling

### Global Styles

**Dosya**: `web/globals.css`

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  background: #f5f5f5;
  color: #333;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}
```

### Component Styles

```typescript
// web/components/button.tsx
'use client'

interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
  onClick?: () => void
}

export function Button({
  children,
  variant = 'primary',
  onClick,
}: ButtonProps) {
  const styles = {
    primary: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700',
    secondary: 'bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400',
  }
  
  return (
    <button
      className={styles[variant]}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
```

## Form Handling

```typescript
'use client'

import { FormEvent, useState } from 'react'
import { api } from '@/lib/api-client'

export default function EventForm() {
  const [formData, setFormData] = useState({
    name: '',
    date: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)
    
    try {
      await api.events.create(formData)
      setSuccess(true)
      setFormData({ name: '', date: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        name="name"
        placeholder="Event name"
        value={formData.name}
        onChange={handleChange}
        required
      />
      
      <input
        type="date"
        name="date"
        value={formData.date}
        onChange={handleChange}
        required
      />
      
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>Event created!</p>}
      
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Event'}
      </button>
    </form>
  )
}
```

## Build ve Deploy

```bash
# Geliştirme
npm run dev

# Production build
npm run build

# Production sunucusunu çalıştır
npm start

# Linting
npm run lint

# Type check
npx tsc --noEmit
```

## Best Practices

1. **'use client' Kullan**: Next.js 13+ App Router'da Client Components için
2. **Type Everything**: TypeScript props ve API responses'ları
3. **Error Handling**: try/catch kullan, user'a error göster
4. **Loading States**: Fetch'in progress'ında loading göster
5. **Lazy Load**: Ağır bileşenler için React.lazy() ve Suspense
6. **Memoization**: Gereksiz re-render'ları önle (useMemo, useCallback)
7. **Progressive Enhancement**: JS olmadan da çalışır mı?

---

**Frontend'de yapmak istediğiniz şey var mı? Detaylı rehber verelim!**
