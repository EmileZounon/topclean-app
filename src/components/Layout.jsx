import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

const staffTabs = [
  { to: '/tickets', label: 'Tickets', icon: TicketIcon },
  { to: '/depenses', label: 'Depenses', icon: ExpenseIcon },
  { to: '/cloture', label: 'Cloture', icon: CloseIcon },
]

const adminTabs = [
  { to: '/', label: 'Accueil', icon: HomeIcon },
  { to: '/tickets', label: 'Tickets', icon: TicketIcon },
  { to: '/depenses', label: 'Depenses', icon: ExpenseIcon },
  { to: '/cloture', label: 'Cloture', icon: CloseIcon },
]

export default function Layout() {
  const { isAdmin, user, logout } = useAuth()
  const tabs = isAdmin ? adminTabs : staffTabs

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50">
      {/* Header */}
      <header className="bg-primary text-white px-4 py-3 flex items-center justify-between shrink-0">
        <h1 className="text-lg font-bold tracking-tight">TopClean+</h1>
        <button
          onClick={logout}
          className="text-sm text-blue-200 hover:text-white"
        >
          Deconnexion
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20 px-4 py-4">
        <Outlet />
      </main>

      {/* Bottom tabs */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around py-2 z-50">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 text-xs px-3 py-1 ${
                isActive ? 'text-primary font-semibold' : 'text-slate-400'
              }`
            }
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function HomeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
      <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625A1.875 1.875 0 013.75 19.875v-6.198a2.29 2.29 0 00.091-.086L12 5.432z" />
    </svg>
  )
}

function TicketIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path fillRule="evenodd" d="M1.5 5.625c0-1.036.84-1.875 1.875-1.875h17.25c1.035 0 1.875.84 1.875 1.875v12.75c0 1.035-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 011.5 18.375V5.625zM21 9.375A.375.375 0 0020.625 9h-9.75a.375.375 0 00-.375.375v1.5c0 .207.168.375.375.375h9.75A.375.375 0 0021 10.875v-1.5zm0 3.75a.375.375 0 00-.375-.375h-9.75a.375.375 0 00-.375.375v1.5c0 .207.168.375.375.375h9.75a.375.375 0 00.375-.375v-1.5zm0 3.75a.375.375 0 00-.375-.375h-9.75a.375.375 0 00-.375.375v1.5c0 .207.168.375.375.375h9.75a.375.375 0 00.375-.375v-1.5zM10.875 18.75a.375.375 0 00.375-.375v-1.5a.375.375 0 00-.375-.375h-6.75a.375.375 0 00-.375.375v1.5c0 .207.168.375.375.375h6.75zM3.75 15.75a.375.375 0 01.375-.375h6.75a.375.375 0 01.375.375v1.5a.375.375 0 01-.375.375h-6.75a.375.375 0 01-.375-.375v-1.5z" clipRule="evenodd" />
    </svg>
  )
}

function ExpenseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M12 7.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" />
      <path fillRule="evenodd" d="M1.5 4.875C1.5 3.839 2.34 3 3.375 3h17.25c1.035 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 011.5 16.125V4.875zM8.25 9.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM18.75 9a.75.75 0 00-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 00.75-.75V9.75a.75.75 0 00-.75-.75h-.008zM4.5 9.75A.75.75 0 015.25 9h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75V9.75z" clipRule="evenodd" />
      <path d="M2.25 18a.75.75 0 000 1.5c5.4 0 10.63.722 15.6 2.075 1.19.324 2.4-.558 2.4-1.82V18.75a.75.75 0 00-.75-.75H2.25z" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path fillRule="evenodd" d="M12 1.5a.75.75 0 01.75.75V4.5a.75.75 0 01-1.5 0V2.25A.75.75 0 0112 1.5zM5.636 4.136a.75.75 0 011.06 0l1.592 1.591a.75.75 0 01-1.061 1.06l-1.591-1.59a.75.75 0 010-1.061zm12.728 0a.75.75 0 010 1.06l-1.591 1.592a.75.75 0 01-1.06-1.061l1.59-1.591a.75.75 0 011.061 0zm-6.816 4.496a.75.75 0 01.82.311l5.228 7.917a.75.75 0 01-.777 1.148l-2.097-.43 1.045 3.9a.75.75 0 01-1.45.388l-1.044-3.899-1.601 1.42a.75.75 0 01-1.247-.606l.569-9.47a.75.75 0 01.554-.679z" clipRule="evenodd" />
    </svg>
  )
}
