import "@/app/globals.css"
import React, { useState, useEffect } from 'react'
import { Check, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

type Order = {
  id: string
  tableNumber: string
  customerName: string
  items: {
    name: string
    quantity: number
    note: string
  }[]
  status: 'pending' | 'preparing' | 'ready' | 'delivered'
  timestamp: Date
}

export default function KuechenSeite() {
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    // Hier würden normalerweise die Bestellungen vom Server abgerufen werden
    const mockOrders: Order[] = [
      {
        id: '1',
        tableNumber: '5',
        customerName: 'Max Mustermann',
        items: [
          { name: 'Margherita Pizza', quantity: 2, note: 'Extra Käse' },
          { name: 'Caesar Salad', quantity: 1, note: '' },
        ],
        status: 'pending',
        timestamp: new Date(),
      },
      {
        id: '2',
        tableNumber: '3',
        customerName: 'Erika Musterfrau',
        items: [
          { name: 'Spaghetti Carbonara', quantity: 1, note: 'Ohne Speck' },
        ],
        status: 'preparing',
        timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
      },
    ]
    setOrders(mockOrders)
  }, [])

  const updateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ))
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Küchenseite - Bestellübersicht</h1>
      <div className="space-y-4">
        {orders.map(order => (
          <Card key={order.id}>
            <CardHeader>
              <CardTitle>Bestellung #{order.id} - Tisch {order.tableNumber}</CardTitle>
              <CardDescription>Bestellt von: {order.customerName} um {order.timestamp.toLocaleTimeString()}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gericht</TableHead>
                    <TableHead>Menge</TableHead>
                    <TableHead>Notiz</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.note || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Badge variant={order.status === 'pending' ? 'default' : order.status === 'preparing' ? 'secondary' : 'success'}>
                {order.status}
              </Badge>
              <div className="space-x-2">
                {order.status === 'pending' && (
                  <Button onClick={() => updateOrderStatus(order.id, 'preparing')}>
                    Zubereitung starten
                  </Button>
                )}
                {order.status === 'preparing' && (
                  <Button onClick={() => updateOrderStatus(order.id, 'ready')}>
                    Fertig zur Abholung
                  </Button>
                )}
                {order.status === 'ready' && (
                  <Button onClick={() => updateOrderStatus(order.id, 'delivered')}>
                    Als geliefert markieren
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}