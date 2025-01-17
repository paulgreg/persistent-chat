import React, { useRef, useEffect, useState } from 'react'
import { isDataUrlImg } from '../media'
import { EmojiPicker } from './EmojiPicker'
import { insertAt } from './strings'
import { useTemporaryWarning } from './temporaryWarning'
import useTimeout from './useTimeout'
import Warning from './Warning'
import config from '../config.mjs'
import './WriteBox.css'

export default function WriteBox({
    login,
    onMessage,
    editMessage,
    setEditMessage,
}) {
    const inputRef = useRef()
    const [message, setMessage] = useState('')
    const [warning, setWarning, setTemporaryWarning] = useTemporaryWarning()
    const [cursorPosition, setCursorPosition] = useState(0)
    const [launch] = useTimeout()

    useEffect(() => {
        if (editMessage) {
            setMessage(editMessage.message)
            inputRef.current.focus()
        }
    }, [editMessage])

    function onChange(e) {
        const msg = e.target.value
        setWarning(
            msg.length >= config.maxMsgSize ? 'Characters limit reached' : ''
        )
        setMessage(msg)
    }

    function onKeyUp(e) {
        setCursorPosition(e.target.selectionStart)
        const trimmedMessage = message.trim()
        const msgLength = trimmedMessage.length

        if (e.key === 'Escape') {
            setMessage('')
            setWarning('')
            setCursorPosition(0)
            setEditMessage(undefined)
        } else if (e.key === 'Enter') {
            if (editMessage && msgLength === 0) {
                setEditMessage(undefined)
            } else if (msgLength > 0 && msgLength < config.maxMsgSize) {
                onMessage({
                    uuid: editMessage?.uuid,
                    timestamp: editMessage?.timestamp,
                    text: trimmedMessage,
                    emojis: editMessage?.emojis,
                })
                setMessage('')
                setWarning('')
                setCursorPosition(0)
            }
        }
    }
    function onClick(e) {
        setCursorPosition(e.target.selectionStart)
    }

    function onPaste(event) {
        var items = (event.clipboardData || event.originalEvent.clipboardData)
            .items
        for (const index in items) {
            const item = items[index]
            if (item.kind === 'file') {
                const reader = new FileReader()
                reader.onload = (event) => {
                    const dataUrl = event.target.result
                    if (!isDataUrlImg(dataUrl)) {
                        setTemporaryWarning(
                            'Pasted object is not an image (only images are supported)'
                        )
                        return
                    }
                    if (dataUrl.length > config.maxMsgSize) {
                        const diff = dataUrl.length - config.maxMsgSize
                        setTemporaryWarning(
                            `Pasted image is too big : ${diff} bytes above limit (${config.maxMsgSize})`
                        )
                        return
                    }
                    onMessage({ text: dataUrl })
                }
                reader.readAsDataURL(item.getAsFile())
            }
        }
    }

    function onSelectEmoji(emoji = {}) {
        const { native } = emoji
        if (native) {
            setMessage(insertAt(message, cursorPosition, native))
            const newPos = cursorPosition + 2
            setCursorPosition(newPos) // Move cursor after emoji
            // Let time to rerender react component before setting cursor position
            launch(() => inputRef.current.setSelectionRange(newPos, newPos))
        }
        inputRef.current.focus()
    }

    return (
        login && (
            <>
                <div className="WriteBox">
                    <label className="WriteBoxLabel" htmlFor="msg">
                        {login}&nbsp;:
                    </label>
                    <input
                        type="text"
                        name="msg"
                        className="WriteBoxInput"
                        ref={inputRef}
                        value={message}
                        onChange={onChange}
                        onKeyUp={onKeyUp}
                        onPaste={onPaste}
                        onClick={onClick}
                        autoComplete="false"
                        minLength="1"
                        maxLength={config.maxMsgSize || 2048}
                        autoFocus
                    ></input>
                    <EmojiPicker onSelectEmoji={onSelectEmoji} />
                </div>
                {warning && <Warning text={warning} />}
            </>
        )
    )
}
