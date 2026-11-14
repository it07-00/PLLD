import React from 'react'
import styles from './Layout.module.css'
import { LOGO_BASE64 } from '../../store/logo'
import { LayoutDashboard, FlaskConical, ClipboardList, BarChart2, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { key: 'new-test', label: 'Kiểm tra mới', icon: <FlaskConical size={20} /> },
  { key: 'history', label: 'Lịch sử', icon: <ClipboardList size={20} /> },
  { key: 'stats', label: 'Thống kê', icon: <BarChart2 size={20} /> },
  { key: 'settings', label: 'Cài đặt', icon: <Settings size={20} /> },
]

export default function Sidebar({ currentPage, onNavigate, isOpen, onClose }) {
  return (
    <>
      {isOpen && <div className={styles.sidebarBackdrop} onClick={onClose} aria-hidden="true" />}
      <aside className={`${styles.sidebar} ${!isOpen ? styles.sidebarCollapsed : ''}`}>
        <div className={styles.sidebarHeader}>
          <img src={`data:image/png;base64,${LOGO_BASE64}`} alt="Bảo Châu" className={styles.logoImg} />
          <div className={styles.logoText}>
            <span className={styles.logoTitle}>Môi Trường Bảo Châu</span>
            <span className={styles.logoSub}>Phân loại lao động</span>
          </div>
        </div>
        <nav className={styles.nav}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              className={`${styles.navItem} ${currentPage === item.key ? styles.navActive : ''}`}
              onClick={() => onNavigate(item.key)}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.copyright}>© 2026 Bảo Châu Environment</div>
        </div>
      </aside>
    </>
  )
}
