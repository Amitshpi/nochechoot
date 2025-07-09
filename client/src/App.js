import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [roles, setRoles] = useState([]);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [presence, setPresence] = useState({ present: [], absent: [] });
  const [activity, setActivity] = useState([]);

  // סינון
  const [userFilters, setUserFilters] = useState({ role: '', platoon: '', company: '', search: '' });
  const [requestFilters, setRequestFilters] = useState({ status: '', user_id: '', start_date: '', end_date: '' });
  const [presenceFilters, setPresenceFilters] = useState({ role: '', platoon: '', company: '' });
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [useMultiRoleFilter, setUseMultiRoleFilter] = useState(false);

  // טופס הוספת משתמש
  const [newUser, setNewUser] = useState({ name: '', rank: '', role: '', phone: '', email: '' });
  
  // טופס הוספת בקשת יציאה
  const [newRequest, setNewRequest] = useState({ 
    user_id: '', 
    start_date: '', 
    end_date: '',
    reason: ''
  });

  // טופס הוספת תפקיד
  const [newRole, setNewRole] = useState({ name: '', description: '', permissions: '' });

  // מצבי עריכה
  const [editingUser, setEditingUser] = useState(null);
  const [editingRequest, setEditingRequest] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showEditRequestModal, setShowEditRequestModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);

  // לוח שנה
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState([]);
  
  // תצוגה שבועית
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [weeklyData, setWeeklyData] = useState([]);
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'week'
  
  // פירוט יום
  const [selectedDayDetails, setSelectedDayDetails] = useState(null);
  const [showDayModal, setShowDayModal] = useState(false);

  // מצבי טעינה
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [isLoadingPresence, setIsLoadingPresence] = useState(false);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [isLoadingWeekly, setIsLoadingWeekly] = useState(false);
  const [isLoadingDayDetails, setIsLoadingDayDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);

  // לוח זמנים אוטומטי
  const [scheduleStartDate, setScheduleStartDate] = useState('');
  const [scheduleEndDate, setScheduleEndDate] = useState('');
  const [leaveSchedule, setLeaveSchedule] = useState([]);
  const [scheduleSummary, setScheduleSummary] = useState(null);
  const [fullSchedule, setFullSchedule] = useState([]);
  const [fullScheduleSummary, setFullScheduleSummary] = useState(null);
  const [isLoadingFullSchedule, setIsLoadingFullSchedule] = useState(false);

  const API_BASE = '/api';

  // טעינת נתונים
  useEffect(() => {
    loadUsers();
    loadRequests();
    loadRoles();
    loadActivity();
  }, []);

  useEffect(() => {
    loadUsers(userFilters);
  }, [userFilters]);

  useEffect(() => {
    loadRequests(requestFilters);
  }, [requestFilters]);

  useEffect(() => {
    loadPresence();
  }, [selectedDate, presenceFilters]);

  useEffect(() => {
    if (viewMode === 'month') {
      loadCalendarData();
    } else {
      loadWeeklyData();
    }
  }, [currentMonth, currentWeek, viewMode, useMultiRoleFilter, selectedRoles]);

  const loadUsers = async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await fetch(`${API_BASE}/users?${params}`);
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadRequests = async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await fetch(`${API_BASE}/requests?${params}`);
      const data = await response.json();
      setRequests(data);
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await fetch(`${API_BASE}/roles`);
      const data = await response.json();
      setRoles(data);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };



  const loadPresence = async () => {
    try {
      const params = new URLSearchParams({ date: selectedDate, ...presenceFilters });
      const response = await fetch(`${API_BASE}/presence?${params}`);
      const data = await response.json();
      setPresence(data);
    } catch (error) {
      console.error('Error loading presence:', error);
    }
  };

  const loadActivity = async () => {
    setIsLoadingActivity(true);
    try {
      const response = await fetch(`${API_BASE}/activity`);
      const data = await response.json();
      setActivity(data);
    } catch (error) {
      console.error('Error loading activity:', error);
    } finally {
      setIsLoadingActivity(false);
    }
  };

  const calculateLeaveSchedule = async () => {
    if (!scheduleStartDate || !scheduleEndDate) {
      alert('נא לבחור טווח תאריכים');
      return;
    }
    
    setIsLoadingSchedule(true);
    try {
      const response = await fetch(`${API_BASE}/schedule-leaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: scheduleStartDate,
          endDate: scheduleEndDate
        })
      });
      const data = await response.json();
      
      if (data.success) {
        setLeaveSchedule(data.schedule);
        setScheduleSummary(data.summary);
        // טעינת לוח השנה המלא
        await loadFullSchedule();
        alert(`לוח הזמנים חושב בהצלחה! ${data.summary.scheduledLeaves} יציאות מתוכננות, ${data.summary.conflicts} קונפליקטים`);
      }
    } catch (error) {
      console.error('Error calculating schedule:', error);
      alert('שגיאה בחישוב לוח הזמנים');
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  const loadLeaveSchedule = async (week = null) => {
    setIsLoadingSchedule(true);
    try {
      const params = week ? `?week=${week}` : '';
      const response = await fetch(`${API_BASE}/leave-schedule${params}`);
      const data = await response.json();
      setLeaveSchedule(data);
    } catch (error) {
      console.error('Error loading leave schedule:', error);
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  const loadScheduleSummary = async () => {
    try {
      const params = new URLSearchParams({
        startDate: scheduleStartDate,
        endDate: scheduleEndDate
      });
      const response = await fetch(`${API_BASE}/schedule-summary?${params}`);
      const data = await response.json();
      setScheduleSummary(data);
    } catch (error) {
      console.error('Error loading schedule summary:', error);
    }
  };

  const loadFullSchedule = async () => {
    try {
      setIsLoadingFullSchedule(true);
      const params = new URLSearchParams({
        startDate: scheduleStartDate,
        endDate: scheduleEndDate
      });
      const response = await fetch(`${API_BASE}/full-schedule?${params}`);
      const data = await response.json();
      setFullSchedule(data.dailySchedule);
      setFullScheduleSummary(data.summary);
    } catch (error) {
      console.error('Error loading full schedule:', error);
    } finally {
      setIsLoadingFullSchedule(false);
    }
  };

  const loadCalendarData = async () => {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const daysInMonth = new Date(year, month, 0).getDate();
      
      const calendarDays = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        
        let params;
        if (useMultiRoleFilter && selectedRoles.length > 0) {
          params = new URLSearchParams({ 
            date, 
            roles: selectedRoles.join(','),
            platoon: presenceFilters.platoon,
            company: presenceFilters.company
          });
          const response = await fetch(`${API_BASE}/presence/multi-role?${params}`);
          const data = await response.json();
          
          calendarDays.push({
            date,
            day,
            present: data.summary.present,
            absent: data.summary.absent,
            pending: data.summary.pending,
            rejected: data.summary.rejected,
            presentUsers: data.present,
            absentUsers: data.absent,
            pendingUsers: data.pending,
            rejectedUsers: data.rejected,
            conflicts: data.conflicts
          });
        } else {
          params = new URLSearchParams({ date, ...presenceFilters });
          const response = await fetch(`${API_BASE}/presence?${params}`);
          const data = await response.json();
          
          calendarDays.push({
            date,
            day,
            present: data.summary.present,
            absent: data.summary.absent,
            pending: data.summary.pending,
            rejected: data.summary.rejected,
            presentUsers: data.present,
            absentUsers: data.absent,
            pendingUsers: data.pending,
            rejectedUsers: data.rejected,
            conflicts: data.conflicts
          });
        }
      }
      setCalendarData(calendarDays);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    }
  };

  const loadWeeklyData = async () => {
    try {
      const startOfWeek = new Date(currentWeek);
      startOfWeek.setDate(currentWeek.getDate() - currentWeek.getDay());
      
      const weeklyDays = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        let params;
        if (useMultiRoleFilter && selectedRoles.length > 0) {
          params = new URLSearchParams({ 
            date: dateStr, 
            roles: selectedRoles.join(','),
            platoon: presenceFilters.platoon,
            company: presenceFilters.company
          });
          const response = await fetch(`${API_BASE}/presence/multi-role?${params}`);
          const data = await response.json();
          
          weeklyDays.push({
            date: dateStr,
            day: date.getDate(),
            dayName: date.toLocaleDateString('he-IL', { weekday: 'short' }),
            present: data.summary.present,
            absent: data.summary.absent,
            pending: data.summary.pending,
            rejected: data.summary.rejected,
            presentUsers: data.present,
            absentUsers: data.absent,
            pendingUsers: data.pending,
            rejectedUsers: data.rejected,
            conflicts: data.conflicts
          });
        } else {
          params = new URLSearchParams({ date: dateStr, ...presenceFilters });
          const response = await fetch(`${API_BASE}/presence?${params}`);
          const data = await response.json();
          
          weeklyDays.push({
            date: dateStr,
            day: date.getDate(),
            dayName: date.toLocaleDateString('he-IL', { weekday: 'short' }),
            present: data.summary.present,
            absent: data.summary.absent,
            pending: data.summary.pending,
            rejected: data.summary.rejected,
            presentUsers: data.present,
            absentUsers: data.absent,
            pendingUsers: data.pending,
            rejectedUsers: data.rejected,
            conflicts: data.conflicts
          });
        }
      }
      setWeeklyData(weeklyDays);
    } catch (error) {
      console.error('Error loading weekly data:', error);
    }
  };

  const loadDayDetails = async (date) => {
    try {
      let params;
      if (useMultiRoleFilter && selectedRoles.length > 0) {
        params = new URLSearchParams({ 
          date, 
          roles: selectedRoles.join(','),
          platoon: presenceFilters.platoon,
          company: presenceFilters.company
        });
        const response = await fetch(`${API_BASE}/presence/multi-role?${params}`);
        const data = await response.json();
        
        setSelectedDayDetails({
          date,
          present: data.present,
          absent: data.absent,
          pending: data.pending,
          rejected: data.rejected,
          conflicts: data.conflicts
        });
      } else {
        params = new URLSearchParams({ date, ...presenceFilters });
        const response = await fetch(`${API_BASE}/presence?${params}`);
        const data = await response.json();
        
        setSelectedDayDetails({
          date,
          present: data.present,
          absent: data.absent,
          pending: data.pending,
          rejected: data.rejected,
          conflicts: data.conflicts
        });
      }
      setShowDayModal(true);
    } catch (error) {
      console.error('Error loading day details:', error);
    }
  };

  const addUser = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      if (response.ok) {
        setNewUser({ name: '', rank: '', role: '', phone: '', email: '' });
        loadUsers(userFilters);
        loadActivity();
      }
    } catch (error) {
      console.error('Error adding user:', error);
    }
  };

  const addRequest = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRequest)
      });
      if (response.ok) {
        setNewRequest({ user_id: '', start_date: '', end_date: '', reason: '' });
        loadRequests(requestFilters);
        loadPresence();
        loadActivity();
      }
    } catch (error) {
      console.error('Error adding request:', error);
    }
  };

  const updateRequestStatus = async (requestId, status) => {
    try {
      const response = await fetch(`${API_BASE}/requests/${requestId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, approved_by: 1 }) // TODO: get current user
      });
      if (response.ok) {
        loadRequests(requestFilters);
        loadPresence();
        loadActivity();
      }
    } catch (error) {
      console.error('Error updating request status:', error);
    }
  };

  const deleteUser = async (userId) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק משתמש זה?')) {
      try {
        const response = await fetch(`${API_BASE}/users/${userId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          loadUsers(userFilters);
          loadActivity();
        }
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const deleteRequest = async (requestId) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק בקשה זו?')) {
      try {
        const response = await fetch(`${API_BASE}/requests/${requestId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          loadRequests(requestFilters);
          loadPresence();
          loadActivity();
        }
      } catch (error) {
        console.error('Error deleting request:', error);
      }
    }
  };

  const addRole = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRole)
      });
      if (response.ok) {
        setNewRole({ name: '', description: '', permissions: '' });
        loadRoles();
        loadActivity();
      }
    } catch (error) {
      console.error('Error adding role:', error);
    }
  };

  const deleteRole = async (roleId) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק תפקיד זה?')) {
      try {
        const response = await fetch(`${API_BASE}/roles/${roleId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          loadRoles();
          loadActivity();
        }
      } catch (error) {
        console.error('Error deleting role:', error);
      }
    }
  };

  // פונקציות עריכה
  const startEditUser = (user) => {
    setEditingUser({ ...user });
    setShowEditUserModal(true);
  };

  const saveEditUser = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser)
      });
      if (response.ok) {
        setShowEditUserModal(false);
        setEditingUser(null);
        loadUsers(userFilters);
        loadActivity();
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const startEditRequest = (request) => {
    setEditingRequest({ ...request });
    setShowEditRequestModal(true);
  };

  const saveEditRequest = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/requests/${editingRequest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRequest)
      });
      if (response.ok) {
        setShowEditRequestModal(false);
        setEditingRequest(null);
        loadRequests(requestFilters);
        loadActivity();
      }
    } catch (error) {
      console.error('Error updating request:', error);
    }
  };

  const startEditRole = (role) => {
    setEditingRole({ ...role });
    setShowEditRoleModal(true);
  };

  const saveEditRole = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/roles/${editingRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRole)
      });
      if (response.ok) {
        setShowEditRoleModal(false);
        setEditingRole(null);
        loadRoles();
        loadActivity();
      }
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const cancelEdit = () => {
    setShowEditUserModal(false);
    setShowEditRequestModal(false);
    setShowEditRoleModal(false);
    setEditingUser(null);
    setEditingRequest(null);
    setEditingRole(null);
  };

  const exportData = async (type) => {
    try {
      const params = new URLSearchParams({
        type,
        start_date: requestFilters.start_date || new Date().toISOString().split('T')[0],
        end_date: requestFilters.end_date || new Date().toISOString().split('T')[0],
        role: presenceFilters.role
      });
      
      const response = await fetch(`${API_BASE}/export?${params}`);
      const data = await response.json();
      
      // יצירת קובץ להורדה
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'danger';
      default: return 'secondary';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'ממתין לאישור';
      case 'approved': return 'אושר';
      case 'rejected': return 'נדחה';
      default: return status;
    }
  };

  const handleRoleToggle = (role) => {
    setSelectedRoles(prev => {
      if (prev.includes(role)) {
        return prev.filter(r => r !== role);
      } else {
        return [...prev, role];
      }
    });
  };

  const hasRoleConflict = (day) => {
    return day.conflicts && day.conflicts.length > 0;
  };

  const getDayClassName = (day) => {
    let className = 'calendar-day';
    if (day.absent > 0) className += ' has-absent';
    if (day.pending > 0) className += ' has-pending';
    if (day.rejected > 0) className += ' has-rejected';
    if (hasRoleConflict(day)) className += ' has-conflict';
    return className;
  };

  const getWeeklyDayClassName = (day) => {
    let className = 'weekly-day';
    if (day.absent > 0) className += ' has-absent';
    if (day.pending > 0) className += ' has-pending';
    if (day.rejected > 0) className += ' has-rejected';
    if (hasRoleConflict(day)) className += ' has-conflict';
    return className;
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>מערכת ניהול יציאות למילואים</h1>
      </header>

      <nav className="tabs">
        <button 
          className={activeTab === 'users' ? 'active' : ''} 
          onClick={() => setActiveTab('users')}
        >
          ניהול אנשים
        </button>
        <button 
          className={activeTab === 'requests' ? 'active' : ''} 
          onClick={() => setActiveTab('requests')}
        >
          בקשות יציאה
        </button>
        <button 
          className={activeTab === 'presence' ? 'active' : ''} 
          onClick={() => setActiveTab('presence')}
        >
          תצוגת נוכחות
        </button>
        <button 
          className={activeTab === 'calendar' ? 'active' : ''} 
          onClick={() => setActiveTab('calendar')}
        >
          לוח שנה
        </button>
        <button 
          className={activeTab === 'activity' ? 'active' : ''} 
          onClick={() => setActiveTab('activity')}
        >
          היסטוריה
        </button>
        <button 
          className={activeTab === 'roles' ? 'active' : ''} 
          onClick={() => setActiveTab('roles')}
        >
          ניהול תפקידים
        </button>
        <button 
          className={activeTab === 'schedule' ? 'active' : ''} 
          onClick={() => setActiveTab('schedule')}
        >
          לוח זמנים אוטומטי
        </button>
      </nav>

      <main className="content">
        {activeTab === 'users' && (
          <div className="tab-content">
            <h2>ניהול אנשים</h2>
            
            {/* סינון */}
            <div className="filters">
              <input
                type="text"
                placeholder="חיפוש..."
                value={userFilters.search}
                onChange={(e) => setUserFilters({...userFilters, search: e.target.value})}
              />
              <select
                value={userFilters.role}
                onChange={(e) => setUserFilters({...userFilters, role: e.target.value})}
              >
                <option value="">כל התפקידים</option>
                {roles.map(role => (
                  <option key={role.id} value={role.name}>{role.name}</option>
                ))}
              </select>
            </div>

            <form onSubmit={addUser} className="form">
              <input
                type="text"
                placeholder="שם מלא"
                value={newUser.name}
                onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                required
              />
              <input
                type="text"
                placeholder="דרגה"
                value={newUser.rank}
                onChange={(e) => setNewUser({...newUser, rank: e.target.value})}
              />
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                required
              >
                <option value="">בחר תפקיד</option>
                {roles.map(role => (
                  <option key={role.id} value={role.name}>{role.name}</option>
                ))}
              </select>
              <input
                type="tel"
                placeholder="טלפון"
                value={newUser.phone}
                onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
              />
              <input
                type="email"
                placeholder="אימייל"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
              />
              <button type="submit">הוסף אדם</button>
            </form>

            <h3>רשימת אנשים ({users.length})</h3>
            <div className="list">
              {users.map(user => (
                <div key={user.id} className="item">
                  <div className="user-info">
                    <strong>{user.name}</strong>
                    {user.rank && <span> - {user.rank}</span>}
                    {user.role && <span> ({user.role})</span>}
                  </div>
                  <div className="user-actions">
                    {user.phone && <span>📞 {user.phone}</span>}
                    {user.email && <span>📧 {user.email}</span>}
                    <button 
                      className="edit-btn"
                      onClick={() => startEditUser(user)}
                    >
                      ✏️
                    </button>
                    <button 
                      className="delete-btn"
                      onClick={() => deleteUser(user.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="tab-content">
            <h2>בקשות יציאה</h2>
            
            {/* סינון */}
            <div className="filters">
              <select
                value={requestFilters.status}
                onChange={(e) => setRequestFilters({...requestFilters, status: e.target.value})}
              >
                <option value="">כל הסטטוסים</option>
                <option value="pending">ממתין לאישור</option>
                <option value="approved">אושר</option>
                <option value="rejected">נדחה</option>
              </select>
              <select
                value={requestFilters.user_id}
                onChange={(e) => setRequestFilters({...requestFilters, user_id: e.target.value})}
              >
                <option value="">כל האנשים</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
              <input
                type="date"
                placeholder="מתאריך"
                value={requestFilters.start_date}
                onChange={(e) => setRequestFilters({...requestFilters, start_date: e.target.value})}
              />
              <input
                type="date"
                placeholder="עד תאריך"
                value={requestFilters.end_date}
                onChange={(e) => setRequestFilters({...requestFilters, end_date: e.target.value})}
              />
            </div>

            <form onSubmit={addRequest} className="form">
              <select
                value={newRequest.user_id}
                onChange={(e) => setNewRequest({...newRequest, user_id: e.target.value})}
                required
              >
                <option value="">בחר אדם</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
              <input
                type="date"
                placeholder="תאריך התחלה"
                value={newRequest.start_date}
                onChange={(e) => setNewRequest({...newRequest, start_date: e.target.value})}
                required
              />
              <input
                type="date"
                placeholder="תאריך סיום"
                value={newRequest.end_date}
                onChange={(e) => setNewRequest({...newRequest, end_date: e.target.value})}
                required
              />
              <textarea
                placeholder="סיבה ליציאה"
                value={newRequest.reason}
                onChange={(e) => setNewRequest({...newRequest, reason: e.target.value})}
              />
              <button type="submit">הוסף בקשת יציאה</button>
            </form>

            <h3>בקשות יציאה ({requests.length})</h3>
            <div className="list">
              {requests.map(request => (
                <div key={request.id} className="item">
                  <div className="request-info">
                    <strong>{request.name}</strong>
                    <span> - {new Date(request.start_date).toLocaleDateString('he-IL')}</span>
                    <span> עד {new Date(request.end_date).toLocaleDateString('he-IL')}</span>
                    <span className={`status ${getStatusColor(request.status)}`}>
                      {getStatusText(request.status)}
                    </span>
                  </div>
                  {request.reason && <div className="reason">{request.reason}</div>}
                  {request.approver_name && (
                    <div className="approver">אושר על ידי: {request.approver_name}</div>
                  )}
                  <div className="request-actions">
                    {request.status === 'pending' && (
                      <>
                        <button 
                          className="approve-btn"
                          onClick={() => updateRequestStatus(request.id, 'approved')}
                        >
                          ✅ אשר
                        </button>
                        <button 
                          className="reject-btn"
                          onClick={() => updateRequestStatus(request.id, 'rejected')}
                        >
                          ❌ דחה
                        </button>
                      </>
                    )}
                    <button 
                      className="edit-btn"
                      onClick={() => startEditRequest(request)}
                    >
                      ✏️
                    </button>
                    <button 
                      className="delete-btn"
                      onClick={() => deleteRequest(request.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'presence' && (
          <div className="tab-content">
            <h2>תצוגת נוכחות</h2>
            
            <div className="presence-controls">
              <div className="date-selector">
                <label>תאריך:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              
              <div className="filters">
                <select
                  value={presenceFilters.role}
                  onChange={(e) => setPresenceFilters({...presenceFilters, role: e.target.value})}
                >
                  <option value="">כל התפקידים</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.name}>{role.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="presence-grid">
              <div className="present-section">
                <h3>נמצאים בבסיס ({presence.present.length})</h3>
                <div className="list">
                  {presence.present.map(user => (
                    <div key={user.id} className="item present">
                      <strong>{user.name}</strong>
                      {user.rank && <span> - {user.rank}</span>}
                      {user.role && <span> ({user.role})</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="absent-section">
                <h3>לא נמצאים בבסיס ({presence.absent.length})</h3>
                <div className="list">
                  {presence.absent.map(user => (
                    <div key={user.id} className="item absent">
                      <strong>{user.name}</strong>
                      {user.rank && <span> - {user.rank}</span>}
                      {user.role && <span> ({user.role})</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="tab-content">
            <h2>לוח שנה</h2>
            
            <div className="calendar-controls">
              <div className="view-toggle">
                <button 
                  className={viewMode === 'month' ? 'active' : ''}
                  onClick={() => setViewMode('month')}
                >
                  📅 חודש
                </button>
                <button 
                  className={viewMode === 'week' ? 'active' : ''}
                  onClick={() => setViewMode('week')}
                >
                  📊 שבוע
                </button>
              </div>
              
              <div className="calendar-filters">
                <div className="filter-section">
                  <label>סינון לפי תפקיד:</label>
                  <div className="filter-toggle">
                    <button 
                      className={!useMultiRoleFilter ? 'active' : ''}
                      onClick={() => setUseMultiRoleFilter(false)}
                    >
                      תפקיד אחד
                    </button>
                    <button 
                      className={useMultiRoleFilter ? 'active' : ''}
                      onClick={() => setUseMultiRoleFilter(true)}
                    >
                      מספר תפקידים
                    </button>
                  </div>
                </div>
                
                {!useMultiRoleFilter ? (
                  <select
                    value={presenceFilters.role}
                    onChange={(e) => setPresenceFilters({...presenceFilters, role: e.target.value})}
                  >
                    <option value="">כל התפקידים</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.name}>{role.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="multi-role-selector">
                    <label>בחר תפקידים:</label>
                    <div className="role-checkboxes">
                      {roles.map(role => (
                        <label key={role.id} className="role-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedRoles.includes(role.name)}
                            onChange={() => handleRoleToggle(role.name)}
                          />
                          <span>{role.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {viewMode === 'month' ? (
                <div className="month-controls">
                  <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
                    ◀️ חודש קודם
                  </button>
                  <h3>{currentMonth.toLocaleDateString('he-IL', { year: 'numeric', month: 'long' })}</h3>
                  <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
                    חודש הבא ▶️
                  </button>
                </div>
              ) : (
                <div className="week-controls">
                  <button onClick={() => setCurrentWeek(new Date(currentWeek.getTime() - 7 * 24 * 60 * 60 * 1000))}>
                    ◀️ שבוע קודם
                  </button>
                  <h3>שבוע {currentWeek.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}</h3>
                  <button onClick={() => setCurrentWeek(new Date(currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000))}>
                    שבוע הבא ▶️
                  </button>
                </div>
              )}
            </div>

            {viewMode === 'month' ? (
              <div className="calendar-grid">
                {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(day => (
                  <div key={day} className="calendar-header">{day}</div>
                ))}
                
                {/* רווחים לימים לפני תחילת החודש */}
                {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() }, (_, i) => (
                  <div key={`empty-${i}`} className="calendar-day empty"></div>
                ))}
                
                {calendarData.map(day => (
                  <div 
                    key={day.date} 
                    className={getDayClassName(day)}
                    onClick={() => loadDayDetails(day.date)}
                  >
                    <div className="day-number">{day.day}</div>
                    {hasRoleConflict(day) && (
                      <div className="conflict-indicator" title={`קונפליקט תפקידים: ${day.conflicts.map(c => `${c.role} (${c.count} אנשים)`).join(', ')}`}>
                        ⚠️
                      </div>
                    )}
                    <div className="day-stats">
                      <span className="present-count">✅ {day.present}</span>
                      {day.absent > 0 && <span className="absent-count">❌ {day.absent}</span>}
                      {day.pending > 0 && <span className="pending-count">⏳ {day.pending}</span>}
                      {day.rejected > 0 && <span className="rejected-count">🚫 {day.rejected}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="weekly-grid">
                {weeklyData.map(day => (
                  <div 
                    key={day.date} 
                    className={getWeeklyDayClassName(day)}
                    onClick={() => loadDayDetails(day.date)}
                  >
                    <div className="day-header">
                      <div className="day-name">{day.dayName}</div>
                      <div className="day-number">{day.day}</div>
                      {hasRoleConflict(day) && (
                        <div className="conflict-indicator" title={`קונפליקט תפקידים: ${day.conflicts.map(c => `${c.role} (${c.count} אנשים)`).join(', ')}`}>
                          ⚠️
                        </div>
                      )}
                    </div>
                    <div className="day-stats">
                      <div className="stat present">
                        <span className="icon">✅</span>
                        <span className="count">{day.present}</span>
                      </div>
                      {day.absent > 0 && (
                        <div className="stat absent">
                          <span className="icon">❌</span>
                          <span className="count">{day.absent}</span>
                        </div>
                      )}
                      {day.pending > 0 && (
                        <div className="stat pending">
                          <span className="icon">⏳</span>
                          <span className="count">{day.pending}</span>
                        </div>
                      )}
                      {day.rejected > 0 && (
                        <div className="stat rejected">
                          <span className="icon">🚫</span>
                          <span className="count">{day.rejected}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Modal לפירוט יום */}
            {showDayModal && selectedDayDetails && (
              <div className="modal-overlay" onClick={() => setShowDayModal(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>פירוט נוכחות - {new Date(selectedDayDetails.date).toLocaleDateString('he-IL')}</h3>
                    <button className="close-btn" onClick={() => setShowDayModal(false)}>✕</button>
                  </div>
                  
                  <div className="modal-body">
                    {selectedDayDetails.conflicts && selectedDayDetails.conflicts.length > 0 && (
                      <div className="conflicts-section">
                        <h4>⚠️ קונפליקטים בתפקידים</h4>
                        <div className="conflicts-list">
                          {selectedDayDetails.conflicts.map((conflict, index) => (
                            <div key={index} className="conflict-item">
                              <strong>{conflict.role}</strong> - {conflict.count} אנשים יוצאים:
                              <ul>
                                {conflict.users.map((user, userIndex) => (
                                  <li key={userIndex}>{user.name} ({user.rank})</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="presence-details">
                      <div className="present-section">
                        <h4>✅ נמצאים בבסיס ({selectedDayDetails.present.length})</h4>
                        <div className="user-list">
                          {selectedDayDetails.present.map(user => (
                            <div key={user.id} className="user-item present">
                              <span className="user-name">{user.name}</span>
                              {user.rank && <span className="user-rank"> - {user.rank}</span>}
                              {user.role && <span className="user-role"> ({user.role})</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="absent-section">
                        <h4>❌ לא נמצאים בבסיס - אושר ({selectedDayDetails.absent.length})</h4>
                        <div className="user-list">
                          {selectedDayDetails.absent.map(user => (
                            <div key={user.id} className="user-item absent">
                              <span className="user-name">{user.name}</span>
                              {user.rank && <span className="user-rank"> - {user.rank}</span>}
                              {user.role && <span className="user-role"> ({user.role})</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {selectedDayDetails.pending && selectedDayDetails.pending.length > 0 && (
                        <div className="pending-section">
                          <h4>⏳ ממתינים לאישור ({selectedDayDetails.pending.length})</h4>
                          <div className="user-list">
                            {selectedDayDetails.pending.map(user => (
                              <div key={user.id} className="user-item pending">
                                <span className="user-name">{user.name}</span>
                                {user.rank && <span className="user-rank"> - {user.rank}</span>}
                                {user.role && <span className="user-role"> ({user.role})</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {selectedDayDetails.rejected && selectedDayDetails.rejected.length > 0 && (
                        <div className="rejected-section">
                          <h4>🚫 נדחו ({selectedDayDetails.rejected.length})</h4>
                          <div className="user-list">
                            {selectedDayDetails.rejected.map(user => (
                              <div key={user.id} className="user-item rejected">
                                <span className="user-name">{user.name}</span>
                                {user.rank && <span className="user-rank"> - {user.rank}</span>}
                                {user.role && <span className="user-role"> ({user.role})</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'roles' && (
          <div className="tab-content">
            <h2>ניהול תפקידים</h2>
            
            <form onSubmit={addRole} className="form">
              <input
                type="text"
                placeholder="שם התפקיד"
                value={newRole.name}
                onChange={(e) => setNewRole({...newRole, name: e.target.value})}
                required
              />
              <input
                type="text"
                placeholder="תיאור התפקיד"
                value={newRole.description}
                onChange={(e) => setNewRole({...newRole, description: e.target.value})}
              />
              <input
                type="text"
                placeholder="הרשאות (אופציונלי)"
                value={newRole.permissions}
                onChange={(e) => setNewRole({...newRole, permissions: e.target.value})}
              />
              <button type="submit">הוסף תפקיד</button>
            </form>

            <h3>רשימת תפקידים ({roles.length})</h3>
            <div className="list">
              {roles.map(role => (
                <div key={role.id} className="item">
                  <div className="role-info">
                    <strong>{role.name}</strong>
                    {role.description && <span> - {role.description}</span>}
                  </div>
                  {role.permissions && (
                    <div className="permissions">הרשאות: {role.permissions}</div>
                  )}
                  <div className="role-actions">
                    <button 
                      className="edit-btn"
                      onClick={() => startEditRole(role)}
                    >
                      ✏️
                    </button>
                    <button 
                      className="delete-btn"
                      onClick={() => deleteRole(role.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="tab-content">
            <h2>היסטוריית פעילות</h2>
            
            <div className="export-controls">
              <button onClick={() => exportData('presence')}>
                📊 ייצוא נוכחות
              </button>
              <button onClick={() => exportData('requests')}>
                📋 ייצוא בקשות
              </button>
            </div>

            {isLoadingActivity ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>טוען היסטוריית פעילות...</p>
              </div>
            ) : (
              <div className="activity-list">
                {activity.map(item => (
                  <div key={item.id} className="activity-item">
                    <div className="activity-time">
                      {new Date(item.created_at).toLocaleString('he-IL')}
                    </div>
                    <div className="activity-action">
                      {item.action === 'CREATE' && 'נוצר'}
                      {item.action === 'UPDATE' && 'עודכן'}
                      {item.action === 'DELETE' && 'נמחק'}
                    </div>
                    <div className="activity-table">
                      {item.table_name === 'users' && 'משתמש'}
                      {item.table_name === 'requests' && 'בקשה'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="tab-content">
            <h2>לוח זמנים אוטומטי</h2>
            
            <div className="schedule-controls">
              <div className="date-range-selector">
                <label>טווח תאריכים:</label>
                <input
                  type="date"
                  value={scheduleStartDate}
                  onChange={(e) => setScheduleStartDate(e.target.value)}
                  placeholder="תאריך התחלה"
                />
                <span>עד</span>
                <input
                  type="date"
                  value={scheduleEndDate}
                  onChange={(e) => setScheduleEndDate(e.target.value)}
                  placeholder="תאריך סיום"
                />
                <button 
                  onClick={calculateLeaveSchedule}
                  disabled={isLoadingSchedule || !scheduleStartDate || !scheduleEndDate}
                  className="calculate-btn"
                >
                  {isLoadingSchedule ? 'מחשב...' : 'חשב לוח זמנים'}
                </button>
              </div>
            </div>

            {scheduleSummary && (
              <div className="schedule-summary">
                <h3>סיכום לוח הזמנים</h3>
                <div className="summary-stats">
                  <div className="stat">
                    <span className="label">סה"כ אנשים:</span>
                    <span className="value">{scheduleSummary.totalUsers}</span>
                  </div>
                  <div className="stat">
                    <span className="label">בקשות יציאה:</span>
                    <span className="value">{scheduleSummary.totalRequests}</span>
                  </div>
                  <div className="stat">
                    <span className="label">יציאות מתוכננות:</span>
                    <span className="value">{scheduleSummary.scheduledLeaves}</span>
                  </div>
                  <div className="stat">
                    <span className="label">קונפליקטים:</span>
                    <span className="value conflict">{scheduleSummary.conflicts}</span>
                  </div>
                </div>
              </div>
            )}

            {isLoadingSchedule ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>מחשב לוח זמנים...</p>
              </div>
            ) : fullSchedule.length > 0 ? (
              <div className="schedule-results">
                <h3>לוח השנה המלא</h3>
                <div className="full-schedule-controls">
                  <button 
                    onClick={loadFullSchedule}
                    disabled={isLoadingFullSchedule}
                    className="refresh-btn"
                  >
                    {isLoadingFullSchedule ? 'מעדכן...' : '🔄 עדכן לוח שנה'}
                  </button>
                </div>
                
                <div className="full-schedule-calendar">
                  {fullSchedule.map((day, dayIndex) => (
                    <div key={dayIndex} className="day-schedule">
                      <div className="day-header">
                        <div className="day-date">{day.dateDisplay}</div>
                        <div className="day-name">{day.dayOfWeek}</div>
                        <div className="day-stats">
                          <span className="in-base">🏠 {day.people.filter(p => p.status === 'in_base').length}</span>
                          <span className="away">🏠 {day.people.filter(p => p.status === 'away').length}</span>
                        </div>
                      </div>
                      
                      <div className="day-people">
                        <div className="in-base-section">
                          <h4>🏠 בבסיס ({day.people.filter(p => p.status === 'in_base').length})</h4>
                          <div className="people-list">
                            {day.people.filter(p => p.status === 'in_base').map(person => (
                              <div key={person.id} className="person-item in-base">
                                <span className="person-name">{person.name}</span>
                                {person.rank && <span className="person-rank"> - {person.rank}</span>}
                                {person.role && <span className="person-role"> ({person.role})</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="away-section">
                          <h4>🏠 בבית ({day.people.filter(p => p.status === 'away').length})</h4>
                          <div className="people-list">
                            {day.people.filter(p => p.status === 'away').map(person => (
                              <div key={person.id} className={`person-item away ${person.hasConflict ? 'conflict' : ''} ${person.priority}`}>
                                <span className="person-name">{person.name}</span>
                                {person.rank && <span className="person-rank"> - {person.rank}</span>}
                                {person.role && <span className="person-role"> ({person.role})</span>}
                                {person.reason && <span className="person-reason"> - {person.reason}</span>}
                                {person.hasConflict && <span className="conflict-indicator">⚠️</span>}
                                {person.priority === 'high' && <span className="priority-badge">בקשה</span>}
                                {person.priority === 'low' && <span className="priority-badge auto">אוטומטי</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="no-schedule">
                <p>אין לוח זמנים מחושב. בחר טווח תאריכים ולחץ על "חשב לוח זמנים".</p>
              </div>
            )}
          </div>
        )}

        {/* מודל עריכת משתמש */}
        {showEditUserModal && editingUser && (
          <div className="modal-overlay" onClick={cancelEdit}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>עריכת משתמש</h3>
                <button className="close-btn" onClick={cancelEdit}>✕</button>
              </div>
              <form onSubmit={saveEditUser} className="modal-body">
                <input
                  type="text"
                  placeholder="שם"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                  required
                />
                <input
                  type="text"
                  placeholder="דרגה"
                  value={editingUser.rank}
                  onChange={(e) => setEditingUser({...editingUser, rank: e.target.value})}
                />
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                  required
                >
                  <option value="">בחר תפקיד</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.name}>{role.name}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  placeholder="טלפון"
                  value={editingUser.phone}
                  onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                />
                <input
                  type="email"
                  placeholder="אימייל"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                />
                <div className="modal-actions">
                  <button type="submit" className="save-btn">שמור</button>
                  <button type="button" onClick={cancelEdit} className="cancel-btn">ביטול</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* מודל עריכת בקשה */}
        {showEditRequestModal && editingRequest && (
          <div className="modal-overlay" onClick={cancelEdit}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>עריכת בקשת יציאה</h3>
                <button className="close-btn" onClick={cancelEdit}>✕</button>
              </div>
              <form onSubmit={saveEditRequest} className="modal-body">
                <select
                  value={editingRequest.user_id}
                  onChange={(e) => setEditingRequest({...editingRequest, user_id: e.target.value})}
                  required
                >
                  <option value="">בחר אדם</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
                <input
                  type="date"
                  placeholder="תאריך התחלה"
                  value={editingRequest.start_date}
                  onChange={(e) => setEditingRequest({...editingRequest, start_date: e.target.value})}
                  required
                />
                <input
                  type="date"
                  placeholder="תאריך סיום"
                  value={editingRequest.end_date}
                  onChange={(e) => setEditingRequest({...editingRequest, end_date: e.target.value})}
                  required
                />
                <textarea
                  placeholder="סיבה ליציאה"
                  value={editingRequest.reason}
                  onChange={(e) => setEditingRequest({...editingRequest, reason: e.target.value})}
                />
                <div className="modal-actions">
                  <button type="submit" className="save-btn">שמור</button>
                  <button type="button" onClick={cancelEdit} className="cancel-btn">ביטול</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* מודל עריכת תפקיד */}
        {showEditRoleModal && editingRole && (
          <div className="modal-overlay" onClick={cancelEdit}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>עריכת תפקיד</h3>
                <button className="close-btn" onClick={cancelEdit}>✕</button>
              </div>
              <form onSubmit={saveEditRole} className="modal-body">
                <input
                  type="text"
                  placeholder="שם התפקיד"
                  value={editingRole.name}
                  onChange={(e) => setEditingRole({...editingRole, name: e.target.value})}
                  required
                />
                <input
                  type="text"
                  placeholder="תיאור התפקיד"
                  value={editingRole.description}
                  onChange={(e) => setEditingRole({...editingRole, description: e.target.value})}
                />
                <input
                  type="text"
                  placeholder="הרשאות (אופציונלי)"
                  value={editingRole.permissions}
                  onChange={(e) => setEditingRole({...editingRole, permissions: e.target.value})}
                />
                <div className="modal-actions">
                  <button type="submit" className="save-btn">שמור</button>
                  <button type="button" onClick={cancelEdit} className="cancel-btn">ביטול</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
