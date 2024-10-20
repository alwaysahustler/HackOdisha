// app/room/[roomId]/page.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

const CANVAS_SIZE = 128 // Size of the canvas grid

export default function Room({ params }: { params: { roomId: string } }) {
  const router = useRouter()
  const { roomId } = params
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null)
  const [color, setColor] = useState<string>('#000000')
  const [drawing, setDrawing] = useState<boolean>(false)

  const ydoc = useRef<Y.Doc | null>(null)
  const wsProvider = useRef<WebsocketProvider | null>(null)
  const pixelArray = useRef<Y.Array<[number, number, string]> | null>(null)

  useEffect(() => {
    if (!roomId) return

    const ws = new WebSocket('wss://demos.yjs.dev')
    ws.onopen = () => console.log('Connection established')
    ws.onerror = (error) => console.error('Connection error', error)
    
    ydoc.current = new Y.Doc()
    wsProvider.current = new WebsocketProvider('ws://localhost:1234', `pixel-room-${roomId}`, ydoc.current)


    wsProvider.current.on('status', (event:any) => {
      console.log(event.status)
    })

    pixelArray.current = ydoc.current.getArray<[number, number, string]>('pixels')

    const canvas = canvasRef.current
    if (canvas) {
      const context = canvas.getContext('2d')
      setCtx(context)
      canvas.width = CANVAS_SIZE
      canvas.height = CANVAS_SIZE
      canvas.style.imageRendering = 'pixelated'
      drawInitialGrid(context)

     
      pixelArray.current.observe((event) => {
        event.changes.added.forEach((change) => {
          change.content.getContent().forEach(([x, y, pixelColor]) => {
            drawPixel(context, x, y, pixelColor)
          })
        })
      })

     
      pixelArray.current.forEach(([x, y, pixelColor]) => {
        drawPixel(context, x, y, pixelColor)
      })
    }

    
    return () => {
      wsProvider.current?.destroy()
      ydoc.current?.destroy()
    }
  }, [roomId])

  // Draw the initial grid on the canvas
  const drawInitialGrid = (context: CanvasRenderingContext2D | null) => {
    if (context) {
      context.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
      for (let x = 0; x < CANVAS_SIZE; x++) {
        for (let y = 0; y < CANVAS_SIZE; y++) {
          drawPixel(context, x, y, '#FFFFFF') // Default to white
        }
      }
    }
  }

  // Function to draw a pixel at a given x, y coordinate
  const drawPixel = (context: CanvasRenderingContext2D | null, x: number, y: number, color: string) => {
    if (context) {
      context.fillStyle = color
      context.fillRect(x, y, 1, 1)
    }
  }

  // Handle mouse down (start drawing)
  const handleMouseDown = (event: React.MouseEvent) => {
    if (!ctx || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = Math.floor((event.clientX - rect.left) / (rect.width / CANVAS_SIZE))
    const y = Math.floor((event.clientY - rect.top) / (rect.height / CANVAS_SIZE))

    drawPixel(ctx, x, y, color)

    
    pixelArray.current?.push([[x, y, color]])
    setDrawing(true)
  }

  
  const handleMouseMove = (event: React.MouseEvent) => {
    if (!ctx || !canvasRef.current || !drawing) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = Math.floor((event.clientX - rect.left) / (rect.width / CANVAS_SIZE))
    const y = Math.floor((event.clientY - rect.top) / (rect.height / CANVAS_SIZE))

    drawPixel(ctx, x, y, color)

    
    pixelArray.current?.push([[x, y, color]])
  }

  
  const handleMouseUp = () => {
    setDrawing(false)
  }

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen">
      <h1 className="text-lg font-bold mb-4">Room ID: {roomId}</h1>

      {/* Canvas for Pixel Art */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="border-2 border-white cursor-crosshair"
      />

      {/* Color Picker */}
      <div className="mt-4">
        <label htmlFor="colorPicker">Choose color:</label>
        <input
          id="colorPicker"
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="ml-2"
        />
      </div>
    </div>
  )
}
