'use client'

import { useState, useEffect } from 'react'

export default function NotificationSettings() {
    const [notificationTime, setNotificationTime] = useState('09:00')
    const [isEnabled, setIsEnabled] = useState(false)
    const [permission, setPermission] = useState<NotificationPermission>('default')

    useEffect(() => {
        // Load saved settings
        const savedTime = localStorage.getItem('notificationTime')
        const savedEnabled = localStorage.getItem('notificationEnabled')

        if (savedTime) setNotificationTime(savedTime)
        if (savedEnabled) setIsEnabled(savedEnabled === 'true')

        // Check notification permission
        if ('Notification' in window) {
            setPermission(Notification.permission)
        }
    }, [])

    useEffect(() => {
        if (!isEnabled) return

        const checkAndNotify = () => {
            const now = new Date()
            const [hours, minutes] = notificationTime.split(':').map(Number)

            if (now.getHours() === hours && now.getMinutes() === minutes) {
                if (Notification.permission === 'granted') {
                    new Notification('論文管理アプリ', {
                        body: '今日も論文を読む時間です!',
                        icon: '/favicon.ico',
                    })
                }
            }
        }

        // Check every minute
        const interval = setInterval(checkAndNotify, 60000)
        return () => clearInterval(interval)
    }, [isEnabled, notificationTime])

    const handleEnableNotifications = async () => {
        if ('Notification' in window) {
            const result = await Notification.requestPermission()
            setPermission(result)

            if (result === 'granted') {
                setIsEnabled(true)
                localStorage.setItem('notificationEnabled', 'true')
                localStorage.setItem('notificationTime', notificationTime)
            }
        }
    }

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = e.target.value
        setNotificationTime(newTime)
        localStorage.setItem('notificationTime', newTime)
    }

    const handleToggle = () => {
        const newEnabled = !isEnabled
        setIsEnabled(newEnabled)
        localStorage.setItem('notificationEnabled', String(newEnabled))
    }

    return (
        <div className="glass p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">🔔 通知設定</h2>

            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <label className="text-gray-300">通知時刻:</label>
                    <input
                        type="time"
                        value={notificationTime}
                        onChange={handleTimeChange}
                        className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                {permission === 'granted' ? (
                    <button
                        onClick={handleToggle}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${isEnabled
                                ? 'bg-green-600 hover:bg-green-500 text-white'
                                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                            }`}
                    >
                        {isEnabled ? '通知ON' : '通知OFF'}
                    </button>
                ) : (
                    <button
                        onClick={handleEnableNotifications}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium rounded-lg"
                    >
                        通知を有効化
                    </button>
                )}

                {isEnabled && (
                    <p className="text-sm text-green-400">
                        ✓ 毎日 {notificationTime} に通知します
                    </p>
                )}
            </div>

            {permission === 'denied' && (
                <p className="text-sm text-red-400 mt-2">
                    通知がブロックされています。ブラウザの設定から許可してください。
                </p>
            )}
        </div>
    )
}
