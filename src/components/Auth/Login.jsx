import React, { useState } from 'react'
import { Button, Input } from '../UI/UI'
import { LOGO_BASE64 } from '../../store/logo'
import { getDefaultApiUrl, getSyncConfig, loginWithServer } from '../../store/sync'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import styles from './Login.module.css'

export default function Login({ onSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [apiUrl, setApiUrl] = useState(() => getSyncConfig().apiUrl || getDefaultApiUrl())
  const [showServer, setShowServer] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const session = await loginWithServer({ username, password, apiUrl })
      onSuccess(session)
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <img src={`data:image/png;base64,${LOGO_BASE64}`} alt="Bảo Châu" className={styles.logo} />
          <h1 className={styles.title}>Môi Trường Bảo Châu</h1>
          <p className={styles.subtitle}>Hệ thống Phân loại Lao động · Đăng nhập để đồng bộ dữ liệu</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <Input
            label="Tên đăng nhập"
            id="login-username"
            autoComplete="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="admin"
            autoFocus
          />

          <div className={styles.passwordWrap}>
            <Input
              label="Mật khẩu"
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
            />
            <button
              type="button"
              className={styles.togglePw}
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button
            type="button"
            className={styles.advancedToggle}
            onClick={() => setShowServer(v => !v)}
          >
            {showServer ? 'Ẩn cấu hình máy chủ' : 'Tùy chọn máy chủ API'}
          </button>

          {showServer && (
            <Input
              label="Địa chỉ API"
              id="login-api-url"
              value={apiUrl}
              onChange={e => setApiUrl(e.target.value)}
              placeholder="https://25percent.tech/api/index.php"
            />
          )}

          {error && <div className={styles.error} role="alert">{error}</div>}

          <Button type="submit" variant="primary" size="lg" className={styles.submitBtn} disabled={loading}>
            <LogIn size={17} />
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
        </form>

        <p className={styles.hint}>
          Sau khi đăng nhập 1 lần, bạn vẫn có thể làm bài test khi mất mạng; dữ liệu sẽ tự động đồng bộ khi có Internet.
        </p>
      </div>
    </div>
  )
}
