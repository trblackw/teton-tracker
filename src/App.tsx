import { Label } from '@radix-ui/react-label';
import { Badge, Clock, MapPin, Navigation, Plane, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import './index.css';
import IconLogo from './lib/icons/icon-logo';
import { type FlightStatus, type NewRunForm, type Run, type RunStatus, type RunType, type TrafficData } from './lib/schema';

export default function App() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [flightStatuses, setFlightStatuses] = useState<{[key: string]: FlightStatus}>({});
  const [trafficData, setTrafficData] = useState<{[key: string]: TrafficData}>({});
  const [newRun, setNewRun] = useState<Partial<NewRunForm>>({
    flightNumber: '',
    airline: '',
    departure: '',
    arrival: '',
    pickupLocation: '',
    dropoffLocation: '',
    scheduledTime: '',
    type: 'pickup',
    notes: ''
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);

  // Load runs from localStorage on component mount with basic validation
  useEffect(() => {
    if (typeof window !== 'undefined') {
    const savedRuns = window.localStorage.getItem('airport-runs');
    if (savedRuns) {
      try {
        const parsedRuns = JSON.parse(savedRuns);
        // Basic validation - ensure required fields exist
        const validatedRuns = parsedRuns
          .filter((run: any) => 
            run && 
            typeof run.id === 'string' &&
            typeof run.flightNumber === 'string' &&
            typeof run.airline === 'string' &&
            typeof run.departure === 'string' &&
            typeof run.arrival === 'string' &&
            typeof run.pickupLocation === 'string' &&
            typeof run.dropoffLocation === 'string' &&
            typeof run.scheduledTime === 'string' &&
            ['pickup', 'dropoff'].includes(run.type) &&
            ['scheduled', 'active', 'completed', 'cancelled'].includes(run.status)
          );
        
        setRuns(validatedRuns);
      } catch (error) {
          console.error('Error parsing runs from localStorage:', error);
        }
      }
    }
  }, []);

  // Save runs to localStorage whenever runs change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('airport-runs', JSON.stringify(runs));
    }
  }, [runs]);

  // Mock flight status API call
  const fetchFlightStatus = async (flightNumber: string) => {
    try {
      setIsLoading(true);
      // This would be replaced with actual OpenSky Network API call
      // const response = await fetch(`https://opensky-network.org/api/flights/departure?airport=KJFK&begin=${beginTime}&end=${endTime}`);
      
      // Mock data for demo
      const mockStatus: FlightStatus = {
        flightNumber,
        status: Math.random() > 0.5 ? 'On Time' : 'Delayed',
        scheduledDeparture: '14:30',
        actualDeparture: '14:35',
        scheduledArrival: '18:45',
        actualArrival: '18:50',
        delay: Math.random() > 0.5 ? 0 : Math.floor(Math.random() * 60),
        lastUpdated: new Date()
      };
      
      setFlightStatuses(prev => ({
        ...prev,
        [flightNumber]: mockStatus
      }));
    } catch (error) {
      console.error('Error fetching flight status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mock traffic data API call
  const fetchTrafficData = async (origin: string, destination: string) => {
    try {
      setIsLoading(true);
      // This would be replaced with actual TomTom Traffic API call
      // const response = await fetch(`https://api.tomtom.com/routing/1/calculateRoute/${origin}:${destination}/json?key=${API_KEY}&traffic=true`);
      
      // Mock data for demo
      const routeKey = `${origin}-${destination}`;
      const baseTime = 30 + Math.random() * 60;
      const trafficMultiplier = 1 + Math.random() * 0.8;
      
      const mockTraffic: TrafficData = {
        route: routeKey,
        duration: Math.floor(baseTime),
        durationInTraffic: Math.floor(baseTime * trafficMultiplier),
        distance: `${(Math.random() * 50 + 10).toFixed(1)} miles`,
        status: trafficMultiplier > 1.4 ? 'heavy' : trafficMultiplier > 1.2 ? 'moderate' : 'good',
        lastUpdated: new Date()
      };
      
      setTrafficData(prev => ({
        ...prev,
        [routeKey]: mockTraffic
      }));
    } catch (error) {
      console.error('Error fetching traffic data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addRun = () => {
    try {
      // Clear previous errors
      setFormErrors({});
      
      // Note: Form validation is available via validateNewRunForm if needed
      
      // Create the run with additional required fields
      const run: Run = {
        id: crypto.randomUUID(),
        ...(newRun as NewRunForm), // Safe cast since validation passed
        status: 'scheduled',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      setRuns(prev => [...prev, run]);
      
      // Fetch initial data for this run
      fetchFlightStatus(run.flightNumber);
      fetchTrafficData(run.pickupLocation, run.dropoffLocation);
      
      // Reset form
      setNewRun({
        flightNumber: '',
        airline: '',
        departure: '',
        arrival: '',
        pickupLocation: '',
        dropoffLocation: '',
        scheduledTime: '',
        type: 'pickup',
        notes: ''
      });
      
    } catch (error) {
      console.error('Error adding run:', error);
      window.alert('Error adding run. Please check your input.');
    }
  };

  const deleteRun = (id: string) => {
    setRuns(prev => prev.filter(run => run.id !== id));
  };

  const updateRunStatus = (id: string, status: RunStatus) => {
    setRuns(prev => prev.map(run => 
      run.id === id 
        ? { ...run, status, updatedAt: new Date() } 
        : run
    ));
  };

  const refreshData = (run: Run) => {
    fetchFlightStatus(run.flightNumber);
    fetchTrafficData(run.pickupLocation, run.dropoffLocation);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrafficColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'heavy': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2"><IconLogo className="w-8 h-8 mr-1 text-blue-500" />Teton Tracker</h1>
          <p className="text-gray-600">Manage your airport pickups and dropoffs with real-time traffic and flight data</p>
        </div>

        <Tabs defaultValue="runs" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="runs">Active Runs</TabsTrigger>
            <TabsTrigger value="add">Add New Run</TabsTrigger>
          </TabsList>

          <TabsContent value="runs" className="space-y-4">
            {runs.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Plane className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No runs scheduled. Add your first run to get started!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {runs.map(run => {
                  const flightStatus = flightStatuses[run.flightNumber];
                  const trafficInfo = trafficData[`${run.pickupLocation}-${run.dropoffLocation}`];
                  
                  return (
                    <Card key={run.id} className="w-full">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{run.flightNumber}</CardTitle>
                            <CardDescription>
                              {run.airline} • {run.departure} → {run.arrival}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(run.status)}>
                              {run.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteRun(run.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Flight Status */}
                          <div className="space-y-2">
                            <h4 className="font-medium flex items-center gap-2">
                              <Plane className="h-4 w-4" />
                              Flight Status
                            </h4>
                            {flightStatus ? (
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium">{flightStatus.status}</span>
                                  {flightStatus.delay && flightStatus.delay > 0 && (
                                    <Badge className="bg-red-500 text-white">
                                      +{flightStatus.delay}m delay
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600">
                                  <div>Scheduled: {flightStatus.scheduledArrival}</div>
                                  <div>Actual: {flightStatus.actualArrival}</div>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-500">
                                No flight data available
                              </div>
                            )}
                          </div>

                          {/* Traffic Status */}
                          <div className="space-y-2">
                            <h4 className="font-medium flex items-center gap-2">
                              <Navigation className="h-4 w-4" />
                              Traffic Status
                            </h4>
                            {trafficInfo ? (
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <Badge className={getTrafficColor(trafficInfo.status)}>
                                    {trafficInfo.status} traffic
                                  </Badge>
                                  <span className="text-sm font-medium">
                                    {trafficInfo.durationInTraffic}m
                                  </span>
                                </div>
                                <div className="text-sm text-gray-600">
                                  <div>Distance: {trafficInfo.distance}</div>
                                  <div>Normal time: {trafficInfo.duration}m</div>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-500">
                                No traffic data available
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Route Information */}
                        <div className="space-y-2">
                          <h4 className="font-medium flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Route
                          </h4>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center justify-between text-sm">
                              <span>From: {run.pickupLocation}</span>
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span>To: {run.dropoffLocation}</span>
                            </div>
                            <div className="mt-2 text-sm text-gray-600">
                              Scheduled: {new Date(run.scheduledTime).toLocaleString()}
                            </div>
                            {run.notes && (
                              <div className="mt-2 text-sm text-gray-600">
                                Notes: {run.notes}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refreshData(run)}
                            disabled={isLoading}
                          >
                            {isLoading ? 'Loading...' : 'Refresh Data'}
                          </Button>
                          {run.status === 'scheduled' && (
                            <Button
                              size="sm"
                              onClick={() => updateRunStatus(run.id, 'active')}
                            >
                              Start Run
                            </Button>
                          )}
                          {run.status === 'active' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => updateRunStatus(run.id, 'completed')}
                            >
                              Complete Run
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="add" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Add New Run</CardTitle>
                <CardDescription>
                  Schedule a new airport pickup or dropoff
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="flight-number">Flight Number *</Label>
                    <Input
                      id="flight-number"
                      placeholder="e.g., AA1234"
                      value={newRun.flightNumber || ''}
                      onChange={(e) => setNewRun(prev => ({ ...prev, flightNumber: e.target.value.toUpperCase() }))}
                      className={formErrors.flightNumber ? 'border-red-500' : ''}
                    />
                    {formErrors.flightNumber && (
                      <p className="text-sm text-red-500">{formErrors.flightNumber}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="airline">Airline *</Label>
                    <Input
                      id="airline"
                      placeholder="e.g., American Airlines"
                      value={newRun.airline || ''}
                      onChange={(e) => setNewRun(prev => ({ ...prev, airline: e.target.value }))}
                      className={formErrors.airline ? 'border-red-500' : ''}
                    />
                    {formErrors.airline && (
                      <p className="text-sm text-red-500">{formErrors.airline}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="departure">Departure Airport *</Label>
                    <Input
                      id="departure"
                      placeholder="e.g., JFK"
                      value={newRun.departure || ''}
                      onChange={(e) => setNewRun(prev => ({ ...prev, departure: e.target.value.toUpperCase() }))}
                      className={formErrors.departure ? 'border-red-500' : ''}
                    />
                    {formErrors.departure && (
                      <p className="text-sm text-red-500">{formErrors.departure}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="arrival">Arrival Airport *</Label>
                    <Input
                      id="arrival"
                      placeholder="e.g., LAX"
                      value={newRun.arrival || ''}
                      onChange={(e) => setNewRun(prev => ({ ...prev, arrival: e.target.value.toUpperCase() }))}
                      className={formErrors.arrival ? 'border-red-500' : ''}
                    />
                    {formErrors.arrival && (
                      <p className="text-sm text-red-500">{formErrors.arrival}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pickup-location">Pickup Location *</Label>
                    <Input
                      id="pickup-location"
                      placeholder="e.g., 123 Main St, City, State"
                      value={newRun.pickupLocation || ''}
                      onChange={(e) => setNewRun(prev => ({ ...prev, pickupLocation: e.target.value }))}
                      className={formErrors.pickupLocation ? 'border-red-500' : ''}
                    />
                    {formErrors.pickupLocation && (
                      <p className="text-sm text-red-500">{formErrors.pickupLocation}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dropoff-location">Dropoff Location *</Label>
                    <Input
                      id="dropoff-location"
                      placeholder="e.g., Airport Terminal 1"
                      value={newRun.dropoffLocation || ''}
                      onChange={(e) => setNewRun(prev => ({ ...prev, dropoffLocation: e.target.value }))}
                      className={formErrors.dropoffLocation ? 'border-red-500' : ''}
                    />
                    {formErrors.dropoffLocation && (
                      <p className="text-sm text-red-500">{formErrors.dropoffLocation}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scheduled-time">Scheduled Time *</Label>
                    <Input
                      id="scheduled-time"
                      type="datetime-local"
                      value={newRun.scheduledTime || ''}
                      onChange={(e) => setNewRun(prev => ({ ...prev, scheduledTime: e.target.value }))}
                      className={formErrors.scheduledTime ? 'border-red-500' : ''}
                    />
                    {formErrors.scheduledTime && (
                      <p className="text-sm text-red-500">{formErrors.scheduledTime}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Run Type *</Label>
                    <select
                      id="type"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={newRun.type || 'pickup'}
                      onChange={(e) => setNewRun(prev => ({ ...prev, type: e.target.value as RunType }))}
                    >
                      <option value="pickup">Pickup (to airport)</option>
                      <option value="dropoff">Dropoff (from airport)</option>
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Input
                      id="notes"
                      placeholder="Additional notes..."
                      value={newRun.notes || ''}
                      onChange={(e) => setNewRun(prev => ({ ...prev, notes: e.target.value }))}
                      className={formErrors.notes ? 'border-red-500' : ''}
                    />
                    {formErrors.notes && (
                      <p className="text-sm text-red-500">{formErrors.notes}</p>
                    )}
                  </div>
                </div>
                <Button onClick={addRun} className="w-full" disabled={isLoading}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Run
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
