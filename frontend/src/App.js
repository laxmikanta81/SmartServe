import React, { useState, useEffect } from 'react';
const API_BASE = 'http://localhost:5000/api';

function App() {
  const [token, setToken] = useState(localStorage.getItem('plateai_token') || '');
  const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem('plateai_user') || 'null'));
  
  const [authMode, setAuthMode] = useState('signin');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [roleInput, setRoleInput] = useState('Admin / Canteen manager');
  const [authError, setAuthError] = useState('');

  const [activeTab, setActiveTab] = useState('overview');
  
  // View mode is derived directly from the user's permanent role (set at registration)
  const isAdminView = currentUser?.role === 'Admin / Canteen manager' || currentUser?.role === 'Admin';

  const [overviewData, setOverviewData] = useState(null);
  
  const [forecastData, setForecastData] = useState({
    expectedAttendance: 438,
    day: 'Wednesday',
    mealType: 'Lunch',
    safetyBuffer: 15,
    temperature: 28,
    rainfall: 0,
    holiday: false,
    campusEvent: false,
    weatherContext: { temp: 28, condition: 'Demo clear weather', rainfall: '0 mm', humidity: '62%' }
  });

  const [calculatedPlan, setCalculatedPlan] = useState(null);
  const [forecastMessage, setForecastMessage] = useState('');

  // Meals & Attendance State
  const [mealsList, setMealsList] = useState([]);
  const [mealSearchQuery, setMealSearchQuery] = useState('');
  const [attendanceSignals, setAttendanceSignals] = useState([]);
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [newMealForm, setNewMealForm] = useState({ name: '', category: 'Lunch', service: 'Tomorrow', planned: 300 });

  // Surplus Food State
  const [surplusList, setSurplusList] = useState([]);
  const [surplusForm, setSurplusForm] = useState({
    mealName: 'Lemon rice & dal',
    category: 'Cooked meal',
    prepared: 440,
    consumed: 410,
    prepTime: '03/18/2026 08:00 AM',
    storageStart: '03/18/2026 01:05 PM',
    temperature: 7
  });

  // Recipients State
  const [recipientsList, setRecipientsList] = useState([
    { id: 1, name: 'Hope Community Kitchen', contact: 'Sarah Jenkins', type: 'Shelter', activeRequests: 2, status: 'Connected' },
    { id: 2, name: 'CareFirst Food Bank', contact: 'Marcus Vance', type: 'Food Bank', activeRequests: 1, status: 'Connected' },
    { id: 3, name: 'Neighborhood Youth Center', contact: 'Elena Rostova', type: 'Community Centre', activeRequests: 3, status: 'Pending match' }
  ]);
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [newRecipientForm, setNewRecipientForm] = useState({ name: '', contact: '', type: 'Shelter' });

  // Impact Analytics State
  const [impactData, setImpactData] = useState({
    totalMealsSaved: 3420,
    co2AvertedKg: 5130,
    peopleFed: 1280,
    communityPartnersCount: 6
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: passwordInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      setToken(data.token);
      setCurrentUser(data.user);
      localStorage.setItem('plateai_token', data.token);
      localStorage.setItem('plateai_user', JSON.stringify(data.user));
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput || 'Maya Sharma', email: emailInput, password: passwordInput, role: roleInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setToken(data.token);
      setCurrentUser(data.user);
      localStorage.setItem('plateai_token', data.token);
      localStorage.setItem('plateai_user', JSON.stringify(data.user));
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    setToken('');
    setCurrentUser(null);
    localStorage.removeItem('plateai_token');
    localStorage.removeItem('plateai_user');
  };

  // Fetch initial data per user
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/overview`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(setOverviewData)
      .catch(() => {});

    fetch(`${API_BASE}/forecast`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { if (data) setForecastData(data); })
      .catch(() => {});

    fetch(`${API_BASE}/meals`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { if (data) setMealsList(data); })
      .catch(() => {});

    fetch(`${API_BASE}/attendance-signals`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { if (data) setAttendanceSignals(data); })
      .catch(() => {});

    fetch(`${API_BASE}/surplus`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { if (data) setSurplusList(data); })
      .catch(() => {});
  }, [token]);

  // Automatic weather fetch when opening website or navigating to demand tab
  useEffect(() => {
    if (!token || activeTab !== 'demand') return;

    const autoSyncWeather = async () => {
      try {
        const res = await fetch(`${API_BASE}/weather/live`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success) {
          setForecastData(prev => ({
            ...prev,
            temperature: data.temperature,
            rainfall: parseFloat(data.rainfall) || 0,
            weatherContext: {
              temp: data.temperature,
              condition: data.condition,
              rainfall: data.rainfall,
              humidity: data.humidity || '62%'
            }
          }));
        }
      } catch (err) {
        // Silent offline fallback
      }
    };

    autoSyncWeather();
  }, [token, activeTab]);

  const handleCalculateForecast = (e) => {
    e.preventDefault();
    if (!isAdminView) {
      setForecastMessage('Permission denied: Recipient view cannot calculate preparation plans.');
      setTimeout(() => setForecastMessage(''), 4000);
      return;
    }
    fetch(`${API_BASE}/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(forecastData)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const attendance = Number(forecastData.expectedAttendance) || 438;
          const buffer = Number(forecastData.safetyBuffer) || 15;
          const predictedDemandVal = Math.round(attendance * 0.93);
          const recommendedPrepVal = predictedDemandVal + buffer;

          setCalculatedPlan({
            predictedDemand: predictedDemandVal,
            recommendedPrep: recommendedPrepVal,
            buffer: buffer,
            day: forecastData.day,
            mealType: forecastData.mealType.toLowerCase(),
            temperature: forecastData.temperature,
            rainfall: forecastData.rainfall,
            planningNote: `Plan for about ${predictedDemandVal} ${forecastData.mealType.toLowerCase()} meals on ${forecastData.day}. Prepare ${recommendedPrepVal} to include the ${buffer}-meal safety buffer.`
          });

          setForecastMessage('Preparation plan calculated successfully!');
          setTimeout(() => setForecastMessage(''), 4000);
        }
      }).catch(() => {});
  };

  const handleSyncWeather = async () => {
    try {
      const res = await fetch(`${API_BASE}/weather/live`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setForecastData(prev => ({
          ...prev,
          temperature: data.temperature,
          rainfall: parseFloat(data.rainfall) || 0,
          weatherContext: {
            temp: data.temperature,
            condition: data.condition,
            rainfall: data.rainfall,
            humidity: data.humidity || '62%'
          }
        }));
        setForecastMessage('Live weather synchronized from API successfully!');
      }
    } catch (err) {
      setForecastMessage('Could not reach live weather API. Using current defaults.');
    }
    setTimeout(() => setForecastMessage(''), 4000);
  };

  const handleMarkServed = (id) => {
    if (!isAdminView) {
      setForecastMessage('Permission denied: Recipient view cannot update meal service statuses.');
      setTimeout(() => setForecastMessage(''), 4000);
      return;
    }
    fetch(`${API_BASE}/meals/${id}/serve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setMealsList(data.meals);
      }).catch(() => {});
  };

  const handleAddMealSubmit = (e) => {
    e.preventDefault();
    if (!isAdminView) return;
    fetch(`${API_BASE}/meals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...newMealForm, status: 'Planned' })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMealsList(data.meals);
          setShowAddMealModal(false);
          setNewMealForm({ name: '', category: 'Lunch', service: 'Tomorrow', planned: 300 });
        }
      }).catch(() => {});
  };

  const handleSaveSurplus = (e) => {
    e.preventDefault();
    if (!isAdminView) {
      setForecastMessage('Permission denied: Recipient view cannot record new surplus meals.');
      setTimeout(() => setForecastMessage(''), 4000);
      return;
    }
    const preparedVal = Number(surplusForm.prepared) || 0;
    const consumedVal = Number(surplusForm.consumed) || 0;
    const quantityVal = Math.max(0, preparedVal - consumedVal);
    
    const tempVal = Number(surplusForm.temperature);
    let safetyStateVal = 'Eligible';
    let actionVal = 'Ready for matching';
    if (tempVal > 8) {
      safetyStateVal = 'Not Eligible';
      actionVal = 'Verify';
    } else if (tempVal === 7 || tempVal === 8) {
      safetyStateVal = 'Eligible';
      actionVal = 'Needs time check';
    }

    const payload = {
      food: surplusForm.mealName,
      category: surplusForm.category,
      quantity: `${quantityVal} meals`,
      storage: `${surplusForm.temperature}°C\nNeeds time check`,
      safetyState: safetyStateVal,
      action: actionVal,
      prepared: preparedVal,
      consumed: consumedVal,
      prepTime: surplusForm.prepTime,
      storageStart: surplusForm.storageStart,
      temperature: tempVal
    };

    fetch(`${API_BASE}/surplus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSurplusList(data.surplusList);
          setForecastMessage('Surplus recorded and saved to database successfully!');
          setTimeout(() => setForecastMessage(''), 4000);
        }
      }).catch(() => {});
  };

  const handleVerifySurplus = (id) => {
    if (!isAdminView) {
      setForecastMessage('Permission denied: Recipient view cannot verify safety states.');
      setTimeout(() => setForecastMessage(''), 4000);
      return;
    }
    fetch(`${API_BASE}/surplus/${id}/verify`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setSurplusList(data.surplusList);
      }).catch(() => {});
  };

  const handleExportCSV = () => {
    if (!surplusList || surplusList.length === 0) {
      setForecastMessage('No surplus records available to export.');
      setTimeout(() => setForecastMessage(''), 4000);
      return;
    }

    const headers = ['Food Name', 'Category', 'Quantity', 'Storage', 'Safety State', 'Action'];
    const rows = surplusList.map(item => [
      `"${item.food}"`,
      `"${item.category}"`,
      `"${item.quantity}"`,
      `"${item.storage?.replace(/\n/g, ' ')}"`,
      `"${item.safetyState}"`,
      `"${item.action}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `surplus_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setForecastMessage('Surplus report exported successfully!');
    setTimeout(() => setForecastMessage(''), 4000);
  };

  const filteredMeals = Array.isArray(mealsList) ? mealsList.filter(meal => 
    (meal.name || '').toLowerCase().includes(mealSearchQuery.toLowerCase()) ||
    (meal.category || '').toLowerCase().includes(mealSearchQuery.toLowerCase())
  ) : [];

  if (!token) {
    return (
      <div className="min-h-screen w-full flex flex-col lg:flex-row font-sans bg-white">
        <div className="lg:w-7/12 relative bg-[#142A1E] text-white p-12 flex flex-col justify-between overflow-hidden min-h-[400px] lg:min-h-screen">
          <div className="absolute inset-0 opacity-40 bg-cover bg-center mix-blend-overlay" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1200&auto=format&fit=crop')` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#142A1E] via-transparent to-transparent" />
          <div className="relative z-10"><p className="text-[11px] font-bold tracking-widest text-[#D1F247] uppercase">PLATEAI · FOOD WITH PURPOSE</p></div>
          <div className="relative z-10 max-w-xl my-auto py-12">
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-none">Serve what matters.</h1>
            <p className="text-gray-300 text-base lg:text-lg">A calmer way to plan meals, protect surplus, and move good food to people who need it.</p>
          </div>
          <div className="relative z-10"><p className="text-[11px] tracking-widest text-gray-400 uppercase">SMART CANTEEN OPERATIONS / 01</p></div>
        </div>

        <div className="lg:w-5/12 p-8 lg:p-16 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto">
            <p className="text-[11px] font-bold tracking-widest text-[#1A7B48] uppercase mb-2">WORKSPACE ACCESS</p>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Good to see you.</h2>
            <p className="text-sm text-gray-500 mb-8">Run the full canteen-to-community flow from one place.</p>

            <div className="flex bg-gray-100 p-1 rounded-xl mb-8">
              <button type="button" onClick={() => { setAuthMode('signin'); setAuthError(''); }} className={`flex-1 py-2.5 text-xs font-bold rounded-lg ${authMode === 'signin' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Sign in</button>
              <button type="button" onClick={() => { setAuthMode('register'); setAuthError(''); }} className={`flex-1 py-2.5 text-xs font-bold rounded-lg ${authMode === 'register' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Register</button>
            </div>

            {authError && <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-lg font-semibold">{authError}</div>}

            <form onSubmit={authMode === 'signin' ? handleLogin : handleRegister} className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
                  <input type="text" value={nameInput} onChange={e => setNameInput(e.target.value)} placeholder="Maya Sharma" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm" required />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email</label>
                <input type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)} placeholder="you@canteen.org" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Password</label>
                <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm" required />
              </div>
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Role (Locked after registration)</label>
                  <select value={roleInput} onChange={e => setRoleInput(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white">
                    <option value="Admin / Canteen manager">Admin / Canteen manager</option>
                    <option value="Recipient / NGO">Recipient / NGO</option>
                  </select>
                </div>
              )}
              <button type="submit" className="w-full py-3.5 bg-[#142A1E] hover:bg-[#1E3B2C] text-white font-bold rounded-xl text-sm mt-2">{authMode === 'signin' ? 'Sign in' : 'Create account'}</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F4F6F4] text-gray-800 font-sans">
      <aside className="w-72 bg-[#142A1E] text-white flex flex-col justify-between p-6 shrink-0">
        <div>
          <div className="mb-8 pt-2">
            <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-1">WORKSPACE</p>
            <p className="text-xl font-bold tracking-tight text-white">PlateAI</p>
          </div>
          <nav className="space-y-1">
            {['Overview', 'Demand forecast', 'Meals & attendance', 'Surplus food', 'Recipients', 'Impact analytics'].map((item) => {
              const id = item.toLowerCase().split(' ')[0];
              return (
                <button key={item} onClick={() => setActiveTab(id)} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${activeTab === id ? 'bg-[#1E3B2C] text-white' : 'text-gray-400 hover:text-white'}`}>
                  {item}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-6 border-t border-[#1E3B2C]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#1A7B48] text-white font-bold flex items-center justify-center text-sm">
              {currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('') : 'MS'}
            </div>
            <div>
              <p className="text-xs font-bold text-white">{currentUser?.name || 'Maya Sharma'}</p>
              <p className="text-[11px] text-gray-400">{currentUser?.role || (isAdminView ? 'Admin / Canteen manager' : 'Recipient / NGO')}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors">
            <span>←</span> Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-[#F4F6F4] px-10 py-6 flex justify-between items-center">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">PLATEAI WORKSPACE</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 shadow-sm">🔔</button>
            <div className="border border-gray-200 rounded-xl px-4 py-2 text-sm bg-white font-semibold text-gray-700 shadow-sm">
              Role: {currentUser?.role || (isAdminView ? 'Admin / Canteen manager' : 'Recipient / NGO')}
            </div>
          </div>
        </header>

        <main className="flex-1 px-10 pb-12 overflow-y-auto">
          {!isAdminView && (
            <div className="mb-6 p-4 bg-amber-50 text-amber-800 text-xs font-bold rounded-xl border border-amber-200 flex items-center justify-between">
              <span>⚠️ Recipient View Active: Management actions (forecasting, surplus recording, verification, and meal planning) are disabled based on your permanent account role.</span>
            </div>
          )}

          {forecastMessage && (
            <div className="mb-6 p-4 bg-emerald-50 text-[#1A7B48] text-xs font-bold rounded-xl border border-emerald-100 flex items-center justify-between">
              <span>{forecastMessage}</span>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{overviewData?.greetingDate || 'WEDNESDAY · 18 MARCH 2026'}</p>
                <h2 className="text-xl font-extrabold text-gray-900">Good morning, {currentUser?.name ? currentUser.name.split(' ')[0] : 'Maya'}</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                  <span className="text-xs font-semibold text-gray-400 block mb-2">Expected demand</span>
                  <p className="text-2xl font-bold text-gray-900">{overviewData?.expectedDemand || '407 meals'}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                  <span className="text-xs font-semibold text-gray-400 block mb-2">Recommended prep</span>
                  <p className="text-2xl font-bold text-gray-900">{overviewData?.recommendedPrep || '422 meals'}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                  <span className="text-xs font-semibold text-gray-400 block mb-2">Actual consumption</span>
                  <p className="text-2xl font-bold text-gray-900">{overviewData?.actualConsumption || '410 meals'}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                  <span className="text-xs font-semibold text-gray-400 block mb-2">Safe surplus</span>
                  <p className="text-2xl font-bold text-gray-900">{overviewData?.safeSurplus || '60 meals'}</p>
                </div>
              </div>

              {overviewData?.chartDays && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Predicted vs Actual Demand</h3>
                      <p className="text-xs text-gray-400">Recent daily trend comparison</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#142A1E] inline-block"></span> Predicted</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#1A7B48] inline-block"></span> Actual</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {overviewData.chartDays.map((item, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <span className="w-12 text-xs font-bold text-gray-500">{item.day}</span>
                        <div className="flex-1 grid grid-cols-2 gap-4">
                          <div>
                            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                              <span>Predicted</span>
                              <span className="font-bold text-gray-700">{item.predicted}</span>
                            </div>
                            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                              <div className="bg-[#142A1E] h-full rounded-full transition-all duration-500" style={{ width: `${(item.predicted / 500) * 100}%` }}></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                              <span>Actual</span>
                              <span className="font-bold text-gray-700">{item.actual}</span>
                            </div>
                            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                              <div className="bg-[#1A7B48] h-full rounded-full transition-all duration-500" style={{ width: `${(item.actual / 500) * 100}%` }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'demand' && (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl lg:text-5xl font-extrabold tracking-tight text-gray-900 mb-2">Demand, made explainable.</h1>
                  <p className="text-gray-500 text-sm">Turn attendance and weather signals into a preparation decision your team can act on.</p>
                </div>
                <button
                  type="button"
                  onClick={handleSyncWeather}
                  className="px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 self-start md:self-auto shrink-0"
                >
                  <span>⚡</span> Sync live weather
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Left Form Box (2 columns wide) */}
                <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                    <div>
                      <h3 className="text-lg font-extrabold text-gray-900">Build a forecast</h3>
                      <p className="text-xs text-gray-400">Local model + GPT-5.4 planning note</p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-50 text-[#1A7B48] text-xs font-bold rounded-full border border-emerald-100 flex items-center gap-1">
                      <span>✨</span> Explainable
                    </span>
                  </div>

                  <form onSubmit={handleCalculateForecast} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Expected attendance</label>
                        <input
                          type="number"
                          value={forecastData.expectedAttendance}
                          disabled={!isAdminView}
                          onChange={e => setForecastData({ ...forecastData, expectedAttendance: e.target.value })}
                          className={`w-full px-4 py-3 border border-gray-200 rounded-xl text-sm ${!isAdminView ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Day</label>
                        <select
                          value={forecastData.day}
                          disabled={!isAdminView}
                          onChange={e => setForecastData({ ...forecastData, day: e.target.value })}
                          className={`w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white ${!isAdminView ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        >
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Meal type</label>
                        <select
                          value={forecastData.mealType}
                          disabled={!isAdminView}
                          onChange={e => setForecastData({ ...forecastData, mealType: e.target.value })}
                          className={`w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white ${!isAdminView ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        >
                          <option value="Lunch">Lunch</option>
                          <option value="Dinner">Dinner</option>
                          <option value="Breakfast">Breakfast</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Safety buffer · meals</label>
                        <input
                          type="number"
                          value={forecastData.safetyBuffer}
                          disabled={!isAdminView}
                          onChange={e => setForecastData({ ...forecastData, safetyBuffer: e.target.value })}
                          className={`w-full px-4 py-3 border border-gray-200 rounded-xl text-sm ${!isAdminView ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Temperature · °C</label>
                        <input
                          type="number"
                          value={forecastData.temperature}
                          disabled={!isAdminView}
                          onChange={e => setForecastData({ ...forecastData, temperature: e.target.value })}
                          className={`w-full px-4 py-3 border border-gray-200 rounded-xl text-sm ${!isAdminView ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Rainfall · mm</label>
                        <input
                          type="number"
                          value={forecastData.rainfall}
                          disabled={!isAdminView}
                          onChange={e => setForecastData({ ...forecastData, rainfall: e.target.value })}
                          className={`w-full px-4 py-3 border border-gray-200 rounded-xl text-sm ${!isAdminView ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <label className={`flex items-center gap-3 p-3 border border-gray-200 rounded-xl ${!isAdminView ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}>
                        <input
                          type="checkbox"
                          checked={forecastData.holiday}
                          disabled={!isAdminView}
                          onChange={e => setForecastData({ ...forecastData, holiday: e.target.checked })}
                          className="w-4 h-4 rounded text-[#1A7B48]"
                        />
                        <span className="text-xs font-bold text-gray-800">Holiday</span>
                      </label>
                      <label className={`flex items-center gap-3 p-3 border border-gray-200 rounded-xl ${!isAdminView ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}>
                        <input
                          type="checkbox"
                          checked={forecastData.campusEvent}
                          disabled={!isAdminView}
                          onChange={e => setForecastData({ ...forecastData, campusEvent: e.target.checked })}
                          className="w-4 h-4 rounded text-[#1A7B48]"
                        />
                        <span className="text-xs font-bold text-gray-800">Campus event</span>
                      </label>
                    </div>

                    <div className="pt-4">
                      {isAdminView ? (
                        <button type="submit" className="px-6 py-3.5 bg-[#142A1E] hover:bg-[#1E3B2C] text-white font-bold rounded-xl text-sm shadow-sm">
                          Calculate preparation plan
                        </button>
                      ) : (
                        <p className="text-xs text-gray-400 italic">Preparation plan calculation is restricted in Recipient View.</p>
                      )}
                    </div>
                  </form>

                  {calculatedPlan && (
                    <div className="mt-6 p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-2">
                      <h4 className="text-xs font-bold text-[#1A7B48] uppercase tracking-wider">Recommended Preparation Plan</h4>
                      <p className="text-sm font-medium text-gray-800">{calculatedPlan.planningNote}</p>
                      <div className="flex gap-6 pt-2 text-xs font-bold text-gray-700">
                        <span>Predicted Demand: <strong className="text-[#1A7B48]">{calculatedPlan.predictedDemand}</strong></span>
                        <span>Recommended Prep: <strong className="text-[#1A7B48]">{calculatedPlan.recommendedPrep}</strong></span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Live Context Weather Panel (1 column wide) */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                  <div>
                    <span className="text-[10px] font-bold text-[#1A7B48] uppercase tracking-widest block mb-1">LIVE CONTEXT</span>
                    <h3 className="text-lg font-extrabold text-gray-900">Weather at campus</h3>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      Weather is an input signal, not a verdict. Refresh it before a new service plan.
                    </p>
                  </div>

                  <div className="flex items-center gap-4 py-4 border-y border-gray-100">
                    <span className="text-4xl">☀️</span>
                    <div>
                      <div className="text-3xl font-extrabold text-gray-900">
                        {forecastData.weatherContext?.temp ?? forecastData.temperature}°
                      </div>
                      <div className="text-xs text-gray-500 font-medium">
                        {forecastData.weatherContext?.condition ?? 'Demo clear weather'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[11px] font-semibold text-gray-400 block mb-1">Rainfall</span>
                      <p className="text-lg font-bold text-gray-900">
                        {forecastData.weatherContext?.rainfall ?? `${forecastData.rainfall} mm`}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-gray-400 block mb-1">Humidity</span>
                      <p className="text-lg font-bold text-gray-900">
                        {forecastData.weatherContext?.humidity ?? '62%'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block">
                      SOURCE · <span className="font-semibold text-gray-600">Demo fallback</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'meals' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-extrabold text-gray-900">Meals & Attendance</h1>
                  <p className="text-xs text-gray-500">Track active meal services and record daily headcounts.</p>
                </div>
                {isAdminView && (
                  <button
                    onClick={() => setShowAddMealModal(true)}
                    className="px-4 py-2.5 bg-[#1A7B48] hover:bg-[#146039] text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                  >
                    + Add Meal Plan
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between">
                <input
                  type="text"
                  placeholder="Search meals by name or category..."
                  value={mealSearchQuery}
                  onChange={e => setMealSearchQuery(e.target.value)}
                  className="w-full max-w-sm px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white shadow-sm"
                />
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                      <th className="py-3 px-6">Meal Name</th>
                      <th className="py-3 px-6">Category</th>
                      <th className="py-3 px-6">Planned</th>
                      <th className="py-3 px-6">Status</th>
                      <th className="py-3 px-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {filteredMeals.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-6 text-gray-400 text-xs">No matching meals found.</td>
                      </tr>
                    ) : (
                      filteredMeals.map(meal => (
                        <tr key={meal._id || meal.mealId} className="hover:bg-gray-50/50">
                          <td className="py-4 px-6 font-semibold text-gray-900">{meal.name}</td>
                          <td className="py-4 px-6 text-xs text-gray-600">{meal.category}</td>
                          <td className="py-4 px-6 font-bold text-gray-900">{meal.planned}</td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${meal.status === 'Served' ? 'bg-emerald-50 text-[#1A7B48]' : 'bg-amber-50 text-amber-700'}`}>
                              {meal.status}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            {meal.status !== 'Served' && isAdminView && (
                              <button
                                onClick={() => handleMarkServed(meal._id || meal.mealId)}
                                className="px-3 py-1 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors"
                              >
                                Mark Served
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'surplus' && (
            <div className="space-y-8">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-gray-900 mb-2">Surplus food.</h1>
                  <p className="text-gray-500 text-sm">Capture what remains, verify it carefully, and make the next handoff visible.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={handleExportCSV} className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2">
                    <span>📥</span> Export CSV
                  </button>
                  {isAdminView && (
                    <button onClick={handleSaveSurplus} className="px-4 py-3 bg-[#1A7B48] hover:bg-[#146039] text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 shrink-0">
                      <span>+</span> Record surplus
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex items-start gap-3 text-xs text-gray-700">
                <span className="text-base text-[#1A7B48]">🛡️</span>
                <div>
                  <span className="font-bold text-gray-900">Decision support, not a replacement for a food-safety professional. </span>
                  <span>Safety thresholds are configurable in Settings and should follow your applicable official guidance.</span>
                </div>
              </div>

              {isAdminView && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                  <form onSubmit={handleSaveSurplus} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Meal name</label>
                        <input type="text" value={surplusForm.mealName} onChange={e => setSurplusForm({...surplusForm, mealName: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm" required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Food category</label>
                        <select value={surplusForm.category} onChange={e => setSurplusForm({...surplusForm, category: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white">
                          <option>Cooked meal</option>
                          <option>Packaged item</option>
                          <option>Bakery</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Prepared</label>
                        <input type="number" value={surplusForm.prepared} onChange={e => setSurplusForm({...surplusForm, prepared: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm" required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Consumed</label>
                        <input type="number" value={surplusForm.consumed} onChange={e => setSurplusForm({...surplusForm, consumed: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm" required />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Preparation time</label>
                        <div className="relative">
                          <input type="text" value={surplusForm.prepTime} onChange={e => setSurplusForm({...surplusForm, prepTime: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm pr-10" required />
                          <span className="absolute right-3 top-3.5 text-gray-400">📅</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Storage start</label>
                        <div className="relative">
                          <input type="text" value={surplusForm.storageStart} onChange={e => setSurplusForm({...surplusForm, storageStart: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm pr-10" required />
                          <span className="absolute right-3 top-3.5 text-gray-400">📅</span>
                        </div>
                      </div>
                    </div>

                    <div className="max-w-sm">
                      <label className="block text-xs font-bold text-gray-700 mb-1">Storage temperature · °C</label>
                      <input type="number" value={surplusForm.temperature} onChange={e => setSurplusForm({...surplusForm, temperature: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm" required />
                    </div>

                    <button type="submit" className="px-6 py-3.5 bg-[#1A7B48] hover:bg-[#146039] text-white font-bold rounded-xl text-sm shadow-sm flex items-center gap-2">
                      <span>📦</span> Save for verification
                    </button>
                  </form>
                </div>
              )}

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900">Surplus register</h3>
                  <p className="text-xs text-gray-400">Every item gets a safety state before matching</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                        <th className="py-3 px-6">Food</th>
                        <th className="py-3 px-6">Quantity</th>
                        <th className="py-3 px-6">Storage</th>
                        <th className="py-3 px-6">Safety state</th>
                        <th className="py-3 px-6">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {surplusList.length === 0 ? (
                        <tr><td colSpan="5" className="text-center py-6 text-gray-400 text-xs">No surplus recorded yet.</td></tr>
                      ) : (
                        surplusList.map((item) => (
                          <tr key={item.surplusId || item._id} className="hover:bg-gray-50/50">
                            <td className="py-4 px-6 font-semibold text-gray-900">
                              <div>{item.food}</div>
                              <div className="text-xs font-normal text-gray-400">{item.category}</div>
                            </td>
                            <td className="py-4 px-6 font-bold text-gray-900">{item.quantity}</td>
                            <td className="py-4 px-6 text-xs text-gray-600 whitespace-pre-line">{item.storage}</td>
                            <td className="py-4 px-6">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${
                                item.safetyState === 'Eligible' ? 'bg-emerald-50 text-[#1A7B48]' :
                                item.safetyState === 'Not Eligible' ? 'bg-red-50 text-red-600' :
                                item.safetyState === 'Needs Verification' ? 'bg-amber-50 text-amber-700' :
                                'bg-gray-100 text-gray-500'
                              }`}>
                                {item.safetyState === 'Eligible' && '✓ '}
                                {item.safetyState}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              {(item.action === 'Verify' || item.action?.includes('Verify')) && isAdminView ? (
                                <button onClick={() => handleVerifySurplus(item.surplusId || item._id)} className="px-3 py-1 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors">
                                  Verify
                                </button>
                              ) : (
                                <span className="text-xs text-gray-400">{item.action}</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'recipients' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-extrabold text-gray-900">Community Recipients & NGOs</h1>
                  <p className="text-xs text-gray-500">Manage partner shelters and food banks for surplus distribution.</p>
                </div>
                {isAdminView && (
                  <button
                    onClick={() => setShowRecipientModal(true)}
                    className="px-4 py-2.5 bg-[#1A7B48] hover:bg-[#146039] text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                  >
                    + Add Recipient
                  </button>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                      <th className="py-3 px-6">Organization Name</th>
                      <th className="py-3 px-6">Contact Person</th>
                      <th className="py-3 px-6">Type</th>
                      <th className="py-3 px-6">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {recipientsList.map(rec => (
                      <tr key={rec.id} className="hover:bg-gray-50/50">
                        <td className="py-4 px-6 font-semibold text-gray-900">{rec.name}</td>
                        <td className="py-4 px-6 text-xs text-gray-600">{rec.contact}</td>
                        <td className="py-4 px-6 text-xs text-gray-600">{rec.type}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${rec.status === 'Connected' ? 'bg-emerald-50 text-[#1A7B48]' : 'bg-amber-50 text-amber-700'}`}>
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'impact' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900">Impact Analytics & Sustainability</h1>
                <p className="text-xs text-gray-500">Track total meals saved, carbon footprint reduction, and community contributions.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <span className="text-xs font-semibold text-gray-400 block mb-2">Total Meals Saved</span>
                  <p className="text-3xl font-extrabold text-[#1A7B48]">{impactData.totalMealsSaved}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <span className="text-xs font-semibold text-gray-400 block mb-2">CO2 Averted (kg)</span>
                  <p className="text-3xl font-extrabold text-[#142A1E]">{impactData.co2AvertedKg} kg</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <span className="text-xs font-semibold text-gray-400 block mb-2">People Fed</span>
                  <p className="text-3xl font-extrabold text-gray-900">{impactData.peopleFed}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <span className="text-xs font-semibold text-gray-400 block mb-2">Partner Organizations</span>
                  <p className="text-3xl font-extrabold text-gray-900">{impactData.communityPartnersCount}</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add Meal Modal */}
      {showAddMealModal && isAdminView && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Meal Plan</h3>
            <form onSubmit={handleAddMealSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Meal Name</label>
                <input
                  type="text"
                  value={newMealForm.name}
                  onChange={e => setNewMealForm({ ...newMealForm, name: e.target.value })}
                  placeholder="e.g. Paneer Tikka & Rice"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
                <select
                  value={newMealForm.category}
                  onChange={e => setNewMealForm({ ...newMealForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
                >
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                  <option value="Breakfast">Breakfast</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Planned Portions</label>
                <input
                  type="number"
                  value={newMealForm.planned}
                  onChange={e => setNewMealForm({ ...newMealForm, planned: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddMealModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1A7B48] hover:bg-[#146039] text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  Save Meal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Recipient Modal */}
      {showRecipientModal && isAdminView && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Community Recipient</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              setRecipientsList([...recipientsList, { id: Date.now(), ...newRecipientForm, status: 'Connected' }]);
              setShowRecipientModal(false);
              setNewRecipientForm({ name: '', contact: '', type: 'Shelter' });
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Organization Name</label>
                <input
                  type="text"
                  value={newRecipientForm.name}
                  onChange={e => setNewRecipientForm({ ...newRecipientForm, name: e.target.value })}
                  placeholder="e.g. City Food Outreach"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  value={newRecipientForm.contact}
                  onChange={e => setNewRecipientForm({ ...newRecipientForm, contact: e.target.value })}
                  placeholder="e.g. Jane Doe"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Type</label>
                <select
                  value={newRecipientForm.type}
                  onChange={e => setNewRecipientForm({ ...newRecipientForm, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
                >
                  <option value="Shelter">Shelter</option>
                  <option value="Food Bank">Food Bank</option>
                  <option value="Community Centre">Community Centre</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRecipientModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1A7B48] hover:bg-[#146039] text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  Save Recipient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;