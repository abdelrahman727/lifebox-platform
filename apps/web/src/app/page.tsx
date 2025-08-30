"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Activity, AlertTriangle, Battery, Droplets, Sun, Zap } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

// Form schema for device control
const deviceControlSchema = z.object({
  command: z.string().min(1, "Command is required"),
  reason: z.string().min(1, "Reason is required"),
})

export default function LifeBoxDashboard() {
  const form = useForm<z.infer<typeof deviceControlSchema>>({
    resolver: zodResolver(deviceControlSchema),
  })

  const onSubmit = (values: z.infer<typeof deviceControlSchema>) => {
    // This would connect to the LifeBox API: POST /api/v1/devices/:deviceId/commands
    console.log("Device command:", values)
  }

  // Mock data representing LifeBox API responses
  const systemMetrics = {
    totalDevices: 24,
    onlineDevices: 22,
    totalClients: 8,
    activeAlarms: 3,
    totalEnergyToday: 1247.5,
    co2Saved: 892.3
  }

  const recentAlarms = [
    { id: 1, device: "Solar Pump #001", type: "Battery Low", severity: 2, time: "2 min ago" },
    { id: 2, device: "Solar Pump #005", type: "Motor Overload", severity: 3, time: "15 min ago" },
    { id: 3, device: "Solar Pump #012", type: "Inverter Fault", severity: 1, time: "1 hour ago" }
  ]

  const devices = [
    { id: "SP001", name: "Solar Pump #001", status: "online", energy: 52.3, water: 1250, battery: 85, location: "Cairo North" },
    { id: "SP002", name: "Solar Pump #002", status: "online", energy: 48.7, water: 1100, battery: 92, location: "Alexandria" },
    { id: "SP003", name: "Solar Pump #003", status: "offline", energy: 0, water: 0, battery: 45, location: "Aswan" },
    { id: "SP004", name: "Solar Pump #004", status: "online", energy: 61.2, water: 1380, battery: 88, location: "Luxor" },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center space-x-2">
            <Sun className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">LifeBox IoT Platform</h1>
          </div>
          <div className="ml-auto flex items-center space-x-4">
            <Badge variant="outline">Super User</Badge>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Quick Command
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Device Command</DialogTitle>
                  <DialogDescription>
                    Send a command to a selected device. This will use the LifeBox API.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="command"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Command Type</FormLabel>
                          <FormControl>
                            <Input placeholder="start_pump" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reason</FormLabel>
                          <FormControl>
                            <Input placeholder="Manual operator override" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full">
                      Send Command
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* System Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemMetrics.totalDevices}</div>
              <p className="text-xs text-muted-foreground">
                {systemMetrics.onlineDevices} online
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Energy Today</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemMetrics.totalEnergyToday} kWh</div>
              <p className="text-xs text-muted-foreground">
                +12% from yesterday
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CO₂ Saved</CardTitle>
              <Sun className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemMetrics.co2Saved} kg</div>
              <p className="text-xs text-muted-foreground">
                Environmental impact today
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Active Alarms Alert */}
        {systemMetrics.activeAlarms > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Active Alarms</AlertTitle>
            <AlertDescription>
              You have {systemMetrics.activeAlarms} active alarms that require attention.
              <Button variant="link" className="h-auto p-0 ml-2">
                View All
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Device Status Table */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Device Status</CardTitle>
              <CardDescription>
                Real-time status of your solar pump systems
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Energy</TableHead>
                    <TableHead>Battery</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{device.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {device.location}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={device.status === 'online' ? 'default' : 'destructive'}
                        >
                          {device.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Zap className="h-3 w-3" />
                          <span>{device.energy} kW</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Battery className="h-3 w-3" />
                          <span>{device.battery}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent Alarms */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Recent Alarms</CardTitle>
              <CardDescription>
                Latest alarm events requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentAlarms.map((alarm) => (
                  <div key={alarm.id} className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <AlertTriangle 
                        className={`h-4 w-4 ${
                          alarm.severity === 3 ? 'text-red-500' : 
                          alarm.severity === 2 ? 'text-yellow-500' : 
                          'text-blue-500'
                        }`} 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {alarm.device}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {alarm.type}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {alarm.time}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* API Integration Note */}
        <Card>
          <CardHeader>
            <CardTitle>API Integration Status</CardTitle>
            <CardDescription>
              This dashboard demonstrates Shadcn/ui components with LifeBox backend integration points
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm font-medium">Real-time Data Sources</Label>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <li>• WebSocket: <code>/api/v1/realtime</code> (JWT authenticated)</li>
                    <li>• Dashboard: <code>/api/v1/dashboard/super-user</code></li>
                    <li>• Telemetry: <code>/api/v1/telemetry/latest</code></li>
                    <li>• Alarms: <code>/api/v1/alarms/events</code></li>
                  </ul>
                </div>
                <div>
                  <Label className="text-sm font-medium">Control Endpoints</Label>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <li>• Commands: <code>POST /api/v1/devices/:id/commands</code></li>
                    <li>• Alarms: <code>POST /api/v1/alarms/events/:id/acknowledge</code></li>
                    <li>• Reports: <code>POST /api/v1/reports/generate</code></li>
                    <li>• Settings: <code>PUT /api/v1/devices/:id</code></li>
                  </ul>
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-4 border-t">
                <Badge variant="secondary">✅ Shadcn/ui Configured</Badge>
                <Badge variant="secondary">✅ Tailwind v3.4.14</Badge>
                <Badge variant="secondary">✅ TypeScript Ready</Badge>
                <Badge variant="secondary">✅ Form Validation</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
