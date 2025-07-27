import React, { useState } from 'react'
import {
  Settings,
  User,
  CreditCard,
  TrendingUp,
  DollarSign,
  Users,
  Activity,
  ChevronDown,
  Search,
  Download,
  Eye,
  EyeOff,
  Star,
  Heart,
  Share2,
  MoreHorizontal
} from 'lucide-react'
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Input,
  Badge,
  Modal,
  ModalContent,
  ModalFooter,
  Tooltip,
  Dropdown,
  Tabs,
  TabsList,
  Tab,
  TabsContent,
  Alert,
  Progress,
  Switch,
  Checkbox,
  RadioGroup,
  Radio,
  Select,
  Textarea
} from '../ui'
import StatCard from '../charts/StatCard'
import LineChart from '../charts/LineChart'
import BarChart from '../charts/BarChart'
import PieChart from '../charts/PieChart'

const AdvancedUIShowcase: React.FC = () => {
  const [showModal, setShowModal] = useState(false)
  const [switchValue, setSwitchValue] = useState(false)
  const [checkboxValue, setCheckboxValue] = useState(false)
  const [radioValue, setRadioValue] = useState('option1')
  const [selectValue, setSelectValue] = useState('')
  const [textareaValue, setTextareaValue] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [showPassword, setShowPassword] = useState(false)

  // Sample data for charts
  const lineChartData = [
    { x: 'Jan', y: 400, label: 'January' },
    { x: 'Feb', y: 300, label: 'February' },
    { x: 'Mar', y: 600, label: 'March' },
    { x: 'Apr', y: 800, label: 'April' },
    { x: 'May', y: 500, label: 'May' },
    { x: 'Jun', y: 900, label: 'June' }
  ]

  const barChartData = [
    { label: 'Football', value: 45, color: '#3B82F6' },
    { label: 'Basketball', value: 30, color: '#EF4444' },
    { label: 'Tennis', value: 25, color: '#10B981' },
    { label: 'Baseball', value: 20, color: '#F59E0B' }
  ]

  const pieChartData = [
    { label: 'Desktop', value: 60, color: '#3B82F6' },
    { label: 'Mobile', value: 35, color: '#EF4444' },
    { label: 'Tablet', value: 5, color: '#10B981' }
  ]

  const selectOptions = [
    { value: 'option1', label: 'Option 1', icon: <User className="h-4 w-4" /> },
    { value: 'option2', label: 'Option 2', icon: <Settings className="h-4 w-4" /> },
    { value: 'option3', label: 'Option 3', icon: <CreditCard className="h-4 w-4" /> }
  ]

  const dropdownItems = [
    { value: 'profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
    { value: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
    { value: 'billing', label: 'Billing', icon: <CreditCard className="h-4 w-4" /> }
  ]

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Advanced UI Components
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive showcase of all available UI components
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Tooltip content="Search functionality">
            <Button variant="outline" leftIcon={<Search className="h-4 w-4" />}>
              Search
            </Button>
          </Tooltip>
          
          <Dropdown
            trigger={
              <Button variant="outline" rightIcon={<ChevronDown className="h-4 w-4" />}>
                Actions
              </Button>
            }
            items={dropdownItems}
            onSelect={(value) => console.log('Selected:', value)}
          />
          
          <Button onClick={() => setShowModal(true)}>
            Open Modal
          </Button>
        </div>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Alert
          variant="info"
          title="Information"
          description="This is an informational alert with additional context."
          dismissible
          onDismiss={() => console.log('Alert dismissed')}
        />
        <Alert
          variant="success"
          title="Success"
          description="Your action was completed successfully."
          actions={[
            { label: 'View Details', onClick: () => console.log('View details') },
            { label: 'Dismiss', onClick: () => console.log('Dismiss'), variant: 'secondary' }
          ]}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value="$45,231"
          change={{ value: 12.5, type: 'increase', period: 'last month' }}
          icon={<DollarSign className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          title="Active Users"
          value="2,345"
          change={{ value: 8.2, type: 'increase', period: 'last week' }}
          icon={<Users className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title="Conversion Rate"
          value="3.24%"
          change={{ value: 2.1, type: 'decrease', period: 'last month' }}
          icon={<TrendingUp className="h-5 w-5" />}
          color="red"
        />
        <StatCard
          title="Server Uptime"
          value="99.9%"
          change={{ value: 0, type: 'neutral', period: 'last 30 days' }}
          icon={<Activity className="h-5 w-5" />}
          color="purple"
        />
      </div>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Tabbed Content</h3>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <Tab value="overview">Overview</Tab>
              <Tab value="analytics">Analytics</Tab>
              <Tab value="reports">Reports</Tab>
              <Tab value="settings" disabled>Settings</Tab>
            </TabsList>
            
            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <LineChart
                  data={lineChartData}
                  title="Revenue Trend"
                  xAxisLabel="Month"
                  yAxisLabel="Revenue ($)"
                  formatValue={(value) => `$${value}`}
                />
                <BarChart
                  data={barChartData}
                  title="Sports Popularity"
                  yAxisLabel="Percentage"
                  formatValue={(value) => `${value}%`}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="analytics">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PieChart
                  data={pieChartData}
                  title="Device Usage"
                  showPercentages
                />
                <Card>
                  <CardHeader>
                    <h4 className="font-semibold">Key Metrics</h4>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Completion Rate</span>
                          <span>78%</span>
                        </div>
                        <Progress value={78} variant="success" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>User Satisfaction</span>
                          <span>92%</span>
                        </div>
                        <Progress value={92} variant="default" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Performance Score</span>
                          <span>65%</span>
                        </div>
                        <Progress value={65} variant="warning" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="reports">
              <Alert
                variant="info"
                title="Reports Coming Soon"
                description="Advanced reporting features will be available in the next update."
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Form Components */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Form Controls</h3>
          </CardHeader>
          <CardContent className="space-y-6">
            <Input
              label="Email Address"
              type="email"
              placeholder="Enter your email"
              leftIcon={<User className="h-4 w-4" />}
            />
            
            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
            </div>
            
            <Select
              label="Select Option"
              options={selectOptions}
              value={selectValue}
              onChange={(e) => setSelectValue(e.target.value)}
              placeholder="Choose an option..."
              searchable
              clearable
            />
            
            <Textarea
              label="Message"
              placeholder="Enter your message..."
              value={textareaValue}
              onChange={(e) => setTextareaValue(e.target.value)}
              autoResize
              helperText="Maximum 500 characters"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Selection Controls</h3>
          </CardHeader>
          <CardContent className="space-y-6">
            <Switch
              label="Enable Notifications"
              description="Receive email notifications for important updates"
              checked={switchValue}
              onChange={(e) => setSwitchValue(e.target.checked)}
            />
            
            <Checkbox
              label="I agree to the terms and conditions"
              description="Please read our terms carefully before agreeing"
              checked={checkboxValue}
              onChange={(e) => setCheckboxValue(e.target.checked)}
            />
            
            <RadioGroup
              name="preferences"
              label="Notification Preferences"
              value={radioValue}
              onChange={setRadioValue}
            >
              <Radio value="option1" label="Email only" />
              <Radio value="option2" label="SMS only" />
              <Radio value="option3" label="Both email and SMS" />
              <Radio value="option4" label="No notifications" disabled />
            </RadioGroup>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Elements */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Interactive Elements</h3>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <Tooltip content="This is a primary button">
              <Button variant="primary">Primary</Button>
            </Tooltip>
            
            <Tooltip content="This is a secondary button">
              <Button variant="secondary">Secondary</Button>
            </Tooltip>
            
            <Tooltip content="This is a danger button">
              <Button variant="danger">Danger</Button>
            </Tooltip>
            
            <Button variant="outline" leftIcon={<Download className="h-4 w-4" />}>
              Download
            </Button>
            
            <Button variant="ghost" rightIcon={<Share2 className="h-4 w-4" />}>
              Share
            </Button>
            
            <div className="flex items-center space-x-2">
              <Badge variant="default">Default</Badge>
              <Badge variant="primary">Primary</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="danger">Danger</Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <Tooltip content="Add to favorites">
                <Button variant="ghost" size="sm">
                  <Heart className="h-4 w-4" />
                </Button>
              </Tooltip>
              
              <Tooltip content="Rate this item">
                <Button variant="ghost" size="sm">
                  <Star className="h-4 w-4" />
                </Button>
              </Tooltip>
              
              <Dropdown
                trigger={
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                }
                items={[
                  { value: 'edit', label: 'Edit' },
                  { value: 'duplicate', label: 'Duplicate' },
                  { value: 'delete', label: 'Delete' }
                ]}
                onSelect={(value) => console.log('Action:', value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Advanced Modal Example"
        size="lg"
      >
        <ModalContent>
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              This is an example of an advanced modal with various interactive elements.
            </p>
            
            <Alert
              variant="warning"
              title="Important Notice"
              description="Please review all information before proceeding."
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Name"
                placeholder="Enter your name"
              />
              <Select
                label="Category"
                options={selectOptions}
                placeholder="Select category..."
              />
            </div>
            
            <Textarea
              label="Description"
              placeholder="Enter description..."
              rows={4}
            />
            
            <div className="flex items-center space-x-4">
              <Switch
                label="Make this public"
                checked={switchValue}
                onChange={(e) => setSwitchValue(e.target.checked)}
              />
              
              <Checkbox
                label="Send notifications"
                checked={checkboxValue}
                onChange={(e) => setCheckboxValue(e.target.checked)}
              />
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => setShowModal(false)}>
            Save Changes
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}

export default AdvancedUIShowcase