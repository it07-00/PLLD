import React from 'react'
import styles from './Layout.module.css'

const PAGE_TITLES = {
  'dashboard': 'Dashboard',
  'new-test': 'Kiểm tra mới',
  'history': 'Lịch sử kiểm tra',
  'stats': 'Thống kê',
  'settings': 'Cài đặt',
}

export default function Topbar({ currentPage, actions, onToggleSidebar }) {
  return (
    <header className={styles.topbar}>
      <div className={styles.topbarLeft}>
        <button className={styles.hamburgerBtn} onClick={onToggleSidebar} aria-label="Toggle Sidebar">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <h1 className={styles.pageTitle}>{PAGE_TITLES[currentPage] || ''}</h1>
      </div>
      <div className={styles.topbarActions}>
        {actions}
      </div>
    </header>
  )
}
