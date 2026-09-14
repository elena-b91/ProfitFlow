import { useEffect, useMemo, useState } from 'react'
import { jsPDF } from 'jspdf'
import { Scatter, ScatterChart, Tooltip, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'
import api from '../api/axios.js'
import HeaderActions from '../components/HeaderActions.jsx'
import SmartAdviceIcon from '../components/SmartAdviceIcon.jsx'
import {
  tableBaseClass,
  tableHeadCellClass,
  tableHeadClass,
  tablePanelClass,
  tablePanelHeaderClass,
  tableRowClass,
} from '../theme/tableClasses.js'

const ingredientSortKeys = {
  name: (item) => (item.name || '').toLowerCase(),
  pricePerUnit: (item) => Number(item.pricePerUnit ?? 0),
  inStockQuantity: (item) => Number(item.inStockQuantity ?? 0),
  purchasedQuantity: (item) => Number(item.purchasedQuantity ?? 0),
  wasteQuantity: (item) => Number(item.wasteQuantity ?? 0),
  entranceDate: (item) => new Date(item.entranceDate || 0).getTime(),
  expirationDate: (item) => new Date(item.expirationDate || 0).getTime(),
  predictedExitDate: (item) => new Date(item.predictedExitDate || 0).getTime(),
  realExitDate: (item) => new Date(item.realExitDate || 0).getTime(),
}

const categoryMeta = {
  HIGH_PERFORMANCE: {
    key: 'HIGH_PERFORMANCE',
    label: 'High Performance',
    description: 'High volume and high profitability — core menu stars.',
    fill: '#0f766e',
  },
  VOLUME_DRIVER: {
    key: 'VOLUME_DRIVER',
    label: 'Volume Driver',
    description: 'High sales volume but below-average margin — consider cost optimization.',
    fill: '#0f4c81',
  },
  MARGIN_GENERATOR: {
    key: 'MARGIN_GENERATOR',
    label: 'Margin Generator',
    description: 'High margin but low volume — promote to increase demand.',
    fill: '#f59e0b',
  },
  UNDER_PERFORMING: {
    key: 'UNDER_PERFORMING',
    label: 'Under-performing',
    description: 'Low volume and low margin — consider removal or recipe change.',
    fill: '#dc2626',
  },
}

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString; // Fallback în caz că string-ul nu e valid

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2); // Ia ultimele două cifre (ex: 26)

  return `${day}/${month}/${year}`;
}
const getRowBgClass = (item) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); 

   if (item.realExitDate) {
    const exitDate = new Date(item.realExitDate);
    exitDate.setHours(0, 0, 0, 0);
    if (exitDate <= today) {
      return ''; 
    }
  }

  const stock = Number(item.inStockQuantity ?? 0);
  
  if (stock <= 0) {
    return '!bg-red-100 hover:!bg-red-200 dark:!bg-rose-950/40 dark:hover:!bg-rose-950/60';
  }

  if (item.expirationDate) {
    const expDate = new Date(item.expirationDate);
    expDate.setHours(0,0,0,0);
    
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysUntilExpiration = (expDate - today) / msPerDay;

    if (daysUntilExpiration <= 0) {
      return '!bg-red-100 hover:!bg-red-200 dark:!bg-rose-950/40 dark:hover:!bg-rose-950/60';
    }
    if (daysUntilExpiration <= 2) {
      return '!bg-amber-100 hover:!bg-amber-200 dark:!bg-amber-950/40 dark:hover:!bg-amber-950/60';
    }
  }

  const unit = (item.unitOfMeasurement || '').toLowerCase();
  if ((unit.includes('kg') || unit.includes('g')) && stock < 2) {
    return '!bg-amber-100 hover:!bg-amber-200 dark:!bg-amber-950/40 dark:hover:!bg-amber-950/60';
  }
  if ((unit.includes('buc') || unit.includes('piec') || unit.includes('pc')) && stock < 10) {
    return '!bg-amber-100 hover:!bg-amber-200 dark:!bg-amber-950/40 dark:hover:!bg-amber-950/60';
  }
  return ''; 
};

const ManagerDashboard = () => {
  const [report, setReport] = useState([])
  const [alerts, setAlerts] = useState([])
  const [users, setUsers] = useState([])
  const [userForm, setUserForm] = useState({
    id: null,
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'CHELNER',
  })
  const [status, setStatus] = useState({ loading: false, error: null })
  const [userStatus, setUserStatus] = useState({ loading: false, error: null, success: null })
  const [range, setRange] = useState({ start: '', end: '' })
  const [viewMode, setViewMode] = useState('chart') // 'chart' | 'table' 
  const [modal, setModal] = useState({ open: false, title: '', body: null })
  const [activeSection, setActiveSection] = useState('home') // 'home' | 'employees' | 'ingredients'
  const [menuItems, setMenuItems] = useState([])
  const [menuForm, setMenuForm] = useState({ id: null, name: '', sellingPrice: '', recipeIngredients: [] })
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false) // Controlează modalul pentru meniu
  const [menuStatus, setMenuStatus] = useState({ loading: false, error: null, success: null })
  const [ingredients, setIngredients] = useState([])
  const [ingredientStatus, setIngredientStatus] = useState({ loading: false, error: null, success: null })
  const [ingredientSearch, setIngredientSearch] = useState('')
  const [ingredientSort, setIngredientSort] = useState({ key: 'name', direction: 'asc' })
  const [readNotificationIds, setReadNotificationIds] = useState([])
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false)
  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false)
  const [ingredientForm, setIngredientForm] = useState({
    name: '',
    pricePerUnit: '',
    inStockQuantity: '',
    purchasedQuantity: '',
    unitOfMeasurement: 'KG',
    entranceDate: new Date().toISOString().split('T'),
    expirationDate: '',
  })

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users')
      setUsers(response.data || [])
    } catch (error) {
      setUserStatus((prev) => ({ ...prev, error: 'Unable to load staff list.' }))
    }
  }

  const fetchDashboard = async () => {
    setStatus({ loading: true, error: null })
    try {
      // Build params only if the user provided dates. Backend will default to last 30 days otherwise.
      const params = {}
      if (range.start) params.start = `${range.start}T00:00:00`
      if (range.end) params.end = `${range.end}T23:59:59`

      const reportResponse = await api.get('/analytics/report', { params })
      const alertsResponse = await api.get('/analytics/alerts')
      setReport(reportResponse.data || [])
      // Backend returns a simple list of strings; normalise to array of messages for the UI
      setAlerts((alertsResponse.data || []).map((a) => (typeof a === 'string' ? { message: a } : a)))
      await fetchUsers()
    } catch (error) {
      setStatus({ loading: false, error: 'Unable to load analytics at the moment.' })
    } finally {
      setStatus((prev) => ({ ...prev, loading: false }))
    }
  }

  const resetUserForm = () => {
    setUserForm({ id: null, username: '', password: '', firstName: '', lastName: '', role: 'CHELNER' })
    setUserStatus({ loading: false, error: null, success: null })
  }

  const handleUserChange = (event) => {
    const { name, value } = event.target
    setUserForm((current) => ({ ...current, [name]: value }))
  }

  const handleEditUser = (user) => {
    setUserForm({
      id: user.id,
      username: user.username,
      password: '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role || 'CHELNER',
    })
    setUserStatus({ loading: false, error: null, success: null })
  }

  const handleDeleteUser = async (userId) => {
    setUserStatus({ loading: true, error: null, success: null })
    try {
      await api.delete(`/users/${userId}`)
      await fetchUsers()
      setUserStatus({ loading: false, error: null, success: 'User deleted successfully.' })
      if (userForm.id === userId) resetUserForm()
    } catch (error) {
      setUserStatus({ loading: false, error: 'Unable to delete user.' })
    }
  }

  const handleUserSubmit = async (event) => {
    event.preventDefault()
    setUserStatus({ loading: true, error: null, success: null })

    try {
      const payload = {
        username: userForm.username.trim(),
        password: userForm.password,
        firstName: userForm.firstName.trim(),
        lastName: userForm.lastName.trim(),
        role: userForm.role,
      }

      if (userForm.id) {
        await api.put(`/users/${userForm.id}`, payload)
        setUserStatus({ loading: false, error: null, success: 'User updated successfully.' })
      } else {
        await api.post('/users', payload)
        setUserStatus({ loading: false, error: null, success: 'Staff member created successfully.' })
      }

      resetUserForm()
      await fetchUsers()
    } catch (error) {
      setUserStatus({ loading: false, error: error?.response?.data || 'Unable to save user.' })
    }
  }

  const fetchMenuItems = async () => {
    try {
      const response = await api.get('/menu-items')
      setMenuItems(response.data || [])
    } catch (error) {
      console.error('Unable to load menu items.', error)
    }
  }

  const fetchIngredients = async () => {
    try {
      const response = await api.get('/ingredients')
      setIngredients(response.data || [])
    } catch (error) {
      console.error('Unable to load ingredients.', error)
      setIngredientStatus((prev) => ({ ...prev, error: 'Unable to load ingredient inventory.' }))
    }
  }

  const resetMenuForm = () => {
    setMenuForm({ id: null, name: '', sellingPrice: '', recipeIngredients: [] })
    setMenuStatus({ loading: false, error: null, success: null })
  };

  const handleMenuChange = (event) => {
    const { name, value } = event.target
    setMenuForm((current) => ({ ...current, [name]: value }))
  }

  // 1. Adaugă un rând nou de ingredient în rețetă
  const handleAddIngredientToRecipe = () => {
    const defaultIngredient = ingredients; 
    if (!defaultIngredient) {
      alert("Please add some ingredients in the Inventory first!");
      return;
    }

    setMenuForm(prev => ({
      ...prev,
      recipeIngredients: [
        ...prev.recipeIngredients,
        { ingredient: defaultIngredient, quantityNeeded: 0 }
      ]
    }));
  };

  // 2. Modifică ingredientul selectat pe un anumit rând
  const handleRecipeIngredientChange = (index, ingredientId) => {
    const selectedIngredient = ingredients.find(i => i.id === Number(ingredientId));
    setMenuForm(prev => {
      const updated = [...prev.recipeIngredients];
      updated[index].ingredient = selectedIngredient;
      return { ...prev, recipeIngredients: updated };
    });
  };

      const handleRecipeQuantityChange = (index, displayQty) => {
    setMenuForm(prev => {
      const updated = [...prev.recipeIngredients];
      const baseUnit = (updated[index].ingredient?.unitOfMeasurement || '').toUpperCase(); // Unitățile din DB: KG, L, BUC
      
      // 1. Forțăm inputul utilizatorului să fie număr întreg
      let integerQty = displayQty === '' ? 0 : Math.round(Number(displayQty));

      // 2. Salvăm valoarea de afișare (întreagă) direct pe obiect pentru a nu o pierde la rerender
      updated[index].displayQuantity = displayQty === '' ? '' : integerQty;

      // 3. Convertim valoarea în unitatea de bază din DB pentru calculul corect al costului
      let baseQty = integerQty;
      if (baseUnit === 'KG' || baseUnit === 'L' || baseUnit === 'LITRU') {
        baseQty = integerQty / 1000; // Transformăm 500g în 0.5kg
      }

      // Valoarea oficială folosită la salvare și costuri
      updated[index].quantityNeeded = baseQty; 
      
      return { ...prev, recipeIngredients: updated };
    });
  };

  // 4. Șterge un ingredient din rețetă
  const handleRemoveIngredientFromRecipe = (index) => {
    setMenuForm(prev => ({
      ...prev,
      recipeIngredients: prev.recipeIngredients.filter((_, i) => i !== index)
    }));
  };

  // 5. Calculează LIVE în interfață costul total al rețetei (Food Cost)
  const calculateTotalRecipeCost = () => {
    if (!menuForm.recipeIngredients) return "0.00";
    return menuForm.recipeIngredients.reduce((total, ri) => {
      const price = ri.ingredient?.pricePerUnit || 0;
      const qty = ri.quantityNeeded || 0;
      return total + (price * qty);
    }, 0).toFixed(2);
  };

  const handleEditMenuItem = (item) => {
    setMenuForm({
      id: item.id,
      name: item.name || '',
      sellingPrice: item.sellingPrice?.toString() || '',
      // Dacă backend-ul trimite deja rețeta salvată, o încărcăm, altfel punem array gol
      recipeIngredients: item.recipeIngredients || []
    });
    setMenuStatus({ loading: false, error: null, success: null });
    setIsMenuModalOpen(true); // Deschide modalul automat la editare
  };

  const handleDeleteMenuItem = async (menuItemId) => {
    if (!window.confirm('Delete this menu item permanently?')) return
    setMenuStatus({ loading: true, error: null, success: null })
    try {
      await api.delete(`/menu-items/${menuItemId}`)
      await fetchMenuItems()
      setMenuStatus({ loading: false, error: null, success: 'Menu item deleted successfully.' })
      if (menuForm.id === menuItemId) {
        resetMenuForm()
      }
    } catch (error) {
      setMenuStatus({ loading: false, error: 'Unable to delete menu item.' })
    }
  }

    const resetIngredientForm = () => {
    setIngredientForm({
      name: '',
      pricePerUnit: '',
      inStockQuantity: '',
      purchasedQuantity: '',
      unitOfMeasurement: 'KG',
      entranceDate: new Date().toISOString().split('T'),
      expirationDate: '',
    })
    setIngredientStatus({ loading: false, error: null, success: null })
  }

  const handleIngredientChange = (event) => {
    const { name, value } = event.target
    setIngredientForm((current) => ({ ...current, [name]: value }))
  }

  const handleIngredientSubmit = async (event) => {
    event.preventDefault()
    setIngredientStatus({ loading: true, error: null, success: null })

    // Validări minime locale
    if (!ingredientForm.name.trim()) {
      setIngredientStatus({ loading: false, error: 'Please enter an ingredient name.', success: null })
      return
    }

    try {
      const payload = {
        name: ingredientForm.name.trim(),
        pricePerUnit: Number(ingredientForm.pricePerUnit || 0),
        inStockQuantity: Number(ingredientForm.inStockQuantity || 0),
        purchasedQuantity: Number(ingredientForm.purchasedQuantity || 0),
        wasteQuantity: 0, // Începe de la 0 pentru un ingredient nou
        unitOfMeasurement: ingredientForm.unitOfMeasurement,
        entranceDate: ingredientForm.entranceDate ? `${ingredientForm.entranceDate}T00:00:00` : null,
        expirationDate: ingredientForm.expirationDate ? `${ingredientForm.expirationDate}T00:00:00` : null,
      }

      await api.post('/ingredients', payload)
      
      setIngredientStatus({ loading: false, error: null, success: 'Ingredient added successfully!' })
      await fetchIngredients() // Reîmprospătează tabelul din spate
      
      // Închidem modalul după un scurt delay ca managerul să vadă mesajul de succes
      setTimeout(() => {
        setIsIngredientModalOpen(false)
        resetIngredientForm()
      }, 1200)

    } catch (error) {
      setIngredientStatus({ 
        loading: false, 
        error: error?.response?.data || 'Unable to save ingredient.', 
        success: null 
      })
    }
  }

  const handleMenuSubmit = async (event) => {
    event.preventDefault()
    setMenuStatus({ loading: true, error: null, success: null })

    if (!menuForm.name.trim()) {
      setMenuStatus({ loading: false, error: 'Please enter a menu item name.', success: null })
      return
    }
    const priceValue = Number(menuForm.sellingPrice)
    if (Number.isNaN(priceValue) || priceValue < 0) {
      setMenuStatus({ loading: false, error: 'Please enter a valid price.', success: null })
      return
    }

    // Maparea corectă a rețetei conform structurii claselor tale de Java din backend
    const payload = {
      name: menuForm.name.trim(),
      sellingPrice: priceValue,
      recipeIngredients: (menuForm.recipeIngredients || []).map(ri => ({
        quantityNeeded: Number(ri.quantityNeeded || 0),
        ingredient: { id: Number(ri.ingredient?.id) } // Trimitem doar obiectul cu ID către JPA
      }))
    }

    try {
      if (menuForm.id) {
        await api.put(`/menu-items/${menuForm.id}`, payload)
        setMenuStatus({ loading: false, error: null, success: 'Menu item updated successfully.' })
      } else {
        await api.post('/menu-items', payload)
        setMenuStatus({ loading: false, error: null, success: 'Menu item created successfully.' })
      }

      await fetchMenuItems()
      
      // Închidem modalul după un scurt delay pentru a confirma succesul vizual
      setTimeout(() => {
        setIsMenuModalOpen(false)
        resetMenuForm()
      }, 1000)

    } catch (error) {
      setMenuStatus({ loading: false, error: error?.response?.data || 'Unable to save menu item.' })
    }
  };

  const generateMenuPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' })
    doc.setFontSize(18)
    doc.text('Menu Items Report', 40, 40)
    doc.setFontSize(11)
    doc.setTextColor('#334155')

    if (!menuItems.length) {
      doc.text('No menu items are available for export.', 40, 70)
    } else {
      let y = 70
      menuItems.forEach((item, index) => {
        if (y > 720) {
          doc.addPage()
          y = 40
        }
        doc.text(`${index + 1}. ${item.name}`, 40, y)
        doc.text(`Price: ${formatCurrency(Number(item.sellingPrice || item.price || 0))}`, 40, y + 14)
        y += 46
      })
    }

    doc.save(`menu-items-report-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const handleUpdateIngredientPrice = async (ingredient) => {
    const promptValue = window.prompt(`Enter new unit price for ${ingredient.name}`, ingredient.pricePerUnit ?? '')
    if (!promptValue) return
    const newPrice = Number(promptValue)
    if (Number.isNaN(newPrice) || newPrice < 0) {
      setIngredientStatus({ loading: false, error: 'Provide a valid numeric price.', success: null })
      return
    }

    setIngredientStatus({ loading: true, error: null, success: null })
    try {
      await api.patch(`/ingredients/${ingredient.id}/price`, null, {
        params: { newPrice },
      })
      await fetchIngredients()
      setIngredientStatus({ loading: false, error: null, success: 'Ingredient price updated successfully.' })
    } catch (error) {
      setIngredientStatus({ loading: false, error: 'Unable to update ingredient price.', success: null })
    }
  }

  const handleReportIngredientWaste = async (ingredient) => {
    const promptValue = window.prompt(`Report waste quantity for ${ingredient.name}`, '0')
    if (!promptValue) return
    const wasteAmount = Number(promptValue)
    if (Number.isNaN(wasteAmount) || wasteAmount <= 0) {
      setIngredientStatus({ loading: false, error: 'Provide a valid waste amount.', success: null })
      return
    }

    setIngredientStatus({ loading: true, error: null, success: null })
    try {
      await api.patch(`/ingredients/${ingredient.id}/waste`, null, {
        params: { amount: wasteAmount },
      })
      await fetchIngredients()
      setIngredientStatus({ loading: false, error: null, success: 'Waste reported successfully.' })
    } catch (error) {
      setIngredientStatus({ loading: false, error: 'Unable to report waste.', success: null })
    }
  }

  useEffect(() => {
    fetchDashboard()
    fetchMenuItems()
    fetchIngredients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredIngredients = useMemo(() => {
    const query = ingredientSearch.trim().toLowerCase()
    let list = ingredients
    if (query) {
      list = list.filter((item) => (item.name || '').toLowerCase().includes(query))
    }

    const getValue = ingredientSortKeys[ingredientSort.key] ?? ingredientSortKeys.name
    const direction = ingredientSort.direction === 'asc' ? 1 : -1

    return [...list].sort((a, b) => {
      const aVal = getValue(a)
      const bVal = getValue(b)
      if (typeof aVal === 'string') {
        return aVal.localeCompare(bVal) * direction
      }
      return (aVal - bVal) * direction
    })
  }, [ingredients, ingredientSearch, ingredientSort])
  
  const ingredientNotifications = useMemo(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const msPerDay = 24 * 60 * 60 * 1000

  const list = []

  ingredients.forEach((item) => {
    // Skip if item has already exited inventory
    if (item.realExitDate) {
      const exitDate = new Date(item.realExitDate)
      exitDate.setHours(0, 0, 0, 0)
      if (exitDate <= today) return
    }

    const stock = Number(item.inStockQuantity ?? 0)
    const uniqueId = `notif-${item.id}`
    
    // Check if user already clicked "done" on this one
    if (readNotificationIds.includes(uniqueId)) return

        // 1. Out of stock condition
    if (stock <= 0) {
      list.push({
        id: uniqueId,
        ingredientId: item.id,
        ingredientName: item.name, // <-- Add this line
        type: 'red',
        title: `${item.name} is completely out of stock!`,
        description: `Current inventory reads 0 ${item.unitOfMeasurement}. Immediate reorder required.`,
      })
      return
    }

    // 2. Expiration conditions
    if (item.expirationDate) {
      const expDate = new Date(item.expirationDate)
      expDate.setHours(0, 0, 0, 0)
      const daysDiff = (expDate - today) / msPerDay

      if (daysDiff <= 0) {
        const daysPassed = Math.abs(daysDiff)
        list.push({
          id: uniqueId,
          ingredientId: item.id,
          ingredientName: item.name, // <-- Add this line
          type: 'red',
          title: `${item.name} has expired!`,
          description: daysPassed === 0 
            ? `Expires today! Secure or discard batch immediately.` 
            : `Expired ${daysPassed} day(s) ago (on ${formatDate(item.expirationDate)}). Spoilage risk.`,
        })
      } else if (daysDiff <= 2) {
        list.push({
          id: uniqueId,
          ingredientId: item.id,
          ingredientName: item.name, // <-- Add this line
          type: 'yellow',
          title: `${item.name} is expiring soon`,
          description: `Only ${Math.ceil(daysDiff)} day(s) left until expiration date (${formatDate(item.expirationDate)}).`,
        })
      }
    }

    // 3. Low stock conditions
        // 3. Low stock conditions
    const unit = (item.unitOfMeasurement || '').toLowerCase()
    const isWeightLow = (unit.includes('kg') || unit.includes('g')) && stock < 2
    const isCountLow = (unit.includes('buc') || unit.includes('piec') || unit.includes('pc')) && stock < 10

    if (isWeightLow || isCountLow) {
      if (!list.some(n => n.ingredientId === item.id)) {
        list.push({
          id: uniqueId,
          ingredientId: item.id,
          ingredientName: item.name,
          type: 'yellow',
          title: `Low stock on ${item.name}`,
          description: `Running low! Only ${stock} ${item.unitOfMeasurement} remaining in current batch.`,
        })
      }
    }
  })

  return list
}, [ingredients, readNotificationIds])

  const handleDismissNotification = (e, notifId) => {
    e.stopPropagation() // Stop modal click from firing row redirection
    setReadNotificationIds((prev) => [...prev, notifId])
  }

  const handleNotificationClick = (ingredientId, ingredientName) => {
    setIsNotificationModalOpen(false)
    setActiveSection('ingredients') // Open the ingredients panel
    
    if (ingredientName) {
      setIngredientSearch(ingredientName) // Filters table to ensure it is visible
    }

    // Let React finish changing tabs before searching the DOM
    setTimeout(() => {
      const targetRow = document.getElementById(`row-ingredient-${ingredientId}`)
      if (targetRow) {
        targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' })
        
        // Dynamic flash effect
        targetRow.classList.add('animate-pulse')
        setTimeout(() => targetRow.classList.remove('animate-pulse'), 1500)
      }
    }, 100)
  }

  const handleIngredientSort = (key) => {
    setIngredientSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const ingredientSortIndicator = (key) => {
    if (ingredientSort.key !== key) return null
    return ingredientSort.direction === 'asc' ? ' ↑' : ' ↓'
  }

  const chartData = useMemo(
    () => {
      // first collect raw y values and normalized categories
      const raw = report.map((item) => {
        const rawY = item.profitMargin != null ? Number(item.profitMargin) : 0
        const normalizedCategory = (item.classification || 'UNDER_PERFORMING')
          .toString()
          .trim()
          .toUpperCase()
          .replace(/\s+/g, '_')
        return {
          x: item.totalOrders ?? 0,
          rawY,
          category: normalizedCategory,
          name: item.menuItemName,
          id: item.menuItemName,
          size: Math.max(50, Math.min(200, (item.totalOrders ? item.totalOrders : 10) * 7)),
          dto: item,
        }
      })

      // detect if y values are fractions (e.g. 0.5324) and should be shown as percent
      const absYs = raw.map((r) => Math.abs(r.rawY))
      const maxAbsY = absYs.length ? Math.max(...absYs) : 0
      const scaleFactor = maxAbsY > 5 ? 1 : 100 // if max <=5, likely fractions -> multiply by 100

      return raw.map((r) => ({
        x: r.x,
        y: r.rawY * scaleFactor,
        _rawY: r.rawY,
        category: r.category,
        name: r.name,
        id: r.id,
        size: r.size,
        dto: r.dto,
      }))
    },
    [report],
  )

  const axisConfig = useMemo(() => {
    if (!chartData || !chartData.length) return null
    const xs = chartData.map((d) => Number(d.x || 0))
    const ys = chartData.map((d) => Number(d.y || 0))
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const halfX = Math.max((maxX - minX) / 2, 1)
    const halfY = Math.max((maxY - minY) / 2, 1)
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    const padFactor = 0.12
    const domainX = [centerX - halfX - Math.abs(halfX * padFactor), centerX + halfX + Math.abs(halfX * padFactor)]
    const domainY = [centerY - halfY - Math.abs(halfY * padFactor), centerY + halfY + Math.abs(halfY * padFactor)]
    // detect if we scaled Y (chartData contains _rawY)
    const yIsPercent = chartData.every((d) => d._rawY !== undefined && Math.abs(d._rawY) <= 5)
    return { centerX, centerY, domainX, domainY, yIsPercent }
  }, [chartData])

    const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null
    const p = payload[0].payload
    const meta = categoryMeta[p.category] || {}
    const yLabel = axisConfig && axisConfig.yIsPercent ? `${p.y.toFixed(2)}%` : p.y.toFixed(2)
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm shadow dark:border-slate-700 dark:bg-slate-800">
        <div className="font-semibold text-slate-900 dark:text-slate-100">{p.name}</div>
        <div className="mt-1 text-slate-600 dark:text-slate-400">{meta.label || p.category}</div>
        <div className="mt-2 text-xs text-slate-700 dark:text-slate-300">Volume: {p.x}</div>
        <div className="text-xs text-slate-700 dark:text-slate-300">Profit margin: {yLabel}</div>
        {meta.description && <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{meta.description}</div>}
      </div>
    )
  }

  const generateRecommendation = (dto) => {
    // dto: MenuItemPerformanceDto shape
    const selling = Number(dto.sellingPrice ?? 0)
    const foodCost = Number(dto.foodCost ?? 0)
    const profit = Number(dto.profitMargin ?? selling - foodCost)
    const marginPct = selling > 0 ? Math.round((profit / selling) * 100) : 0

    let suggestion = { summary: '', details: '' }

    switch ((dto.classification || '').toUpperCase()) {
      case 'HIGH_PERFORMANCE':
        suggestion.summary = 'Keep on menu — stable performer.'
        suggestion.details = `High volume and margin (${marginPct}%). Consider small price increase (2-4%) or maintain visibility.`
        break
      case 'VOLUME_DRIVER':
        suggestion.summary = 'Optimize costs or nudge price.'
        suggestion.details = `High sales but low margin (${marginPct}%). Recommend reducing recipe cost by 5-10% (target largest-cost ingredient) and test a price increase of 3-7% to improve unit economics.`
        break
      case 'MARGIN_GENERATOR':
        suggestion.summary = 'Promote this item to increase volume.'
        suggestion.details = `Strong margin (${marginPct}%) but low sales. Try visibility boosts (feature on menu, promotions) before changing price.`
        break
      default:
        suggestion.summary = 'Investigate or replace.'
        suggestion.details = `Low volume and low margin (${marginPct}%). Review recipe for cost reduction opportunities; consider discontinuation if improvement isn\'t feasible.`
    }

    // Provide simple actionable numbers
    suggestion.actionable = {
      targetPriceChangePct:
        dto.classification === 'VOLUME_DRIVER' ? 5 : dto.classification === 'HIGH_PERFORMANCE' ? 3 : 0,
      targetRecipeCostReductionPct: dto.classification === 'VOLUME_DRIVER' ? 8 : dto.classification === 'UNDER_PERFORMING' ? 5 : 0,
    }

    return suggestion
  }

  const openRecommendationForAlert = (alert) => {
    // Try to extract a quoted menu item name from the alert text
    const msg = alert.message || alert.text || ''
    const m = msg.match(/'([^']+)'/) || msg.match(/\"([^\"]+)\"/)
    const name = m ? m[1] : null
    const dto = name ? report.find((r) => r.menuItemName === name) : null
    if (dto) {
      const rec = generateRecommendation(dto)
      setModal({ open: true, title: `Recommendation — ${dto.menuItemName}`, body: { dto, rec, alert } })
    } else {
      setModal({ open: true, title: 'Insight detail', body: { alert } })
    }
  }

  const handleRangeChange = (event) => {
    const { name, value } = event.target
    setRange((current) => ({ ...current, [name]: value }))
  }

  return (
    <div className="min-h-screen bg-[#f8fbff] px-6 py-8 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 rounded-[32px] bg-white dark:bg-slate-900 p-8 shadow-[0_30px_60px_rgba(15,76,129,0.08)] dark:shadow-[0_30px_60px_rgba(0,0,0,0.35)] md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-sky-600">Manager Dashboard</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">Analytics & Optimization</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Review menu performance, receive smart alerts, and turn data into action.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsNotificationModalOpen(true)}
              className="relative rounded-full bg-slate-100 p-3 text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {/* SVG representation of a functional dashboard Bell Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
              
              {/* Dynamic Badged Counter */}
              {ingredientNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[11px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                  {ingredientNotifications.length}
                </span>
              )}
            </button>

            <HeaderActions />
          </div>
        </header>

        {status.error && (
          <div className="rounded-3xl border border-rose-100 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/50 px-6 py-4 text-sm text-rose-700 dark:text-rose-300">
            {status.error}
          </div>
        )}

        <div className="rounded-[32px] bg-white dark:bg-slate-900 p-8 shadow-[0_30px_60px_rgba(15,76,129,0.08)] dark:shadow-[0_30px_60px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {/* <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Manager workspace</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Quick links</h2>
            </div> */}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {[
              { id: 'home', label: 'Home' },
              { id: 'employees', label: 'Employees' },
              { id: 'ingredients', label: 'Ingredients' },
            ].map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`rounded-3xl px-4 py-3 text-sm font-semibold transition ${activeSection === section.id ? 'bg-slate-900 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>

        {activeSection === 'home' ? (
          <div className="space-y-8">
            <section className="grid gap-8 xl:grid-cols-[2fr_1fr]">
              <div className="rounded-[32px] bg-white dark:bg-slate-900 p-8 shadow-[0_30px_60px_rgba(15,76,129,0.08)] dark:shadow-[0_30px_60px_rgba(0,0,0,0.35)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Performance matrix</p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Menu engineering overview</h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                      Start date
                      <input
                        type="date"
                        name="start"
                        value={range.start}
                        onChange={handleRangeChange}
                        className="w-full rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-slate-100"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                      End date
                      <input
                        type="date"
                        name="end"
                        value={range.end}
                        onChange={handleRangeChange}
                        className="w-full rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-slate-100"
                      />
                    </label>
                    <div className="flex flex-1 items-center gap-3 flex-wrap">
                      <div className="inline-flex rounded-3xl bg-slate-50 dark:bg-slate-800 p-1">
                        <button
                          type="button"
                          onClick={() => setViewMode('chart')}
                          className={`px-3 py-2 text-sm ${viewMode === 'chart' ? 'bg-slate-900 text-white rounded-3xl' : 'text-slate-700 dark:text-slate-300 rounded-3xl'}`}
                        >
                          Chart
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode('table')}
                          className={`px-3 py-2 text-sm ${viewMode === 'table' ? 'bg-slate-900 text-white rounded-3xl' : 'text-slate-700 dark:text-slate-300 rounded-3xl'}`}
                        >
                          Table
                        </button>
                      </div>
                      <button
                        type="button"
                        className="ml-2 rounded-3xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                        onClick={fetchDashboard}
                        disabled={status.loading}
                      >
                        Apply filter
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-8 w-full rounded-[32px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-100" style={{ aspectRatio: '12/8' }}>
                  {status.loading ? (
                    <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">Loading analytics…</div>
                  ) : viewMode === 'chart' && chartData.length ? (
                    <div className="flex h-full items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 40, right: 40, bottom: 50, left: 60 }}>
                          <CartesianGrid strokeDasharray="4 4" />
                          <XAxis
                            type="number"
                            dataKey="x"
                            name="Volume"
                            domain={axisConfig ? [
                              Math.floor(axisConfig.domainX[0]),
                              Math.ceil(axisConfig.domainX[1])
                            ] : ['auto', 'auto']}
                            label={{ value: 'Sales Volume', position: 'insideBottomRight', offset: -20, dx: -260, fill: '#0f172a', style: { fontWeight: 600 } }}
                          />
                          <YAxis
                            type="number"
                            dataKey="y"
                            name="Profit"
                            domain={axisConfig ? [
                              Math.floor(axisConfig.domainY[0]),
                              Math.ceil(axisConfig.domainY[1])
                            ] : ['auto', 'auto']}
                            tickFormatter={(v) => (axisConfig && axisConfig.yIsPercent ? `${v.toFixed(2)}%` : v.toFixed(2))}
                            label={{ value: 'Weighted Profit Margin', angle: -90, position: 'insideLeft', offset: -20, dy: 75, fill: '#0f172a', style: { fontWeight: 600 } }}
                          />
                          {axisConfig && (
                            <>
                              <ReferenceLine x={axisConfig.centerX} stroke="#94a3b8" strokeDasharray="3 3" />
                              <ReferenceLine y={axisConfig.centerY} stroke="#94a3b8" strokeDasharray="3 3" />
                            </>
                          )}
                          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                          <Legend verticalAlign="top" height={36} />
                          {Object.keys(categoryMeta).map((category) => (
                            <Scatter
                              key={category}
                              name={categoryMeta[category].label}
                              data={chartData.filter((item) => item.category === category)}
                              fill={categoryMeta[category].fill}
                            />
                          ))}
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  ) : viewMode === 'table' && report.length ? (
                    <div className="overflow-auto">
                      <table className={`${tableBaseClass} table-auto`}>
                        <thead className={`${tableHeadClass} text-xs`}>
                          <tr>
                            <th className="px-4 py-3">Menu item</th>
                            <th className="px-4 py-3">Orders</th>
                            <th className="px-4 py-3">Selling</th>
                            <th className="px-4 py-3">Food cost</th>
                            <th className="px-4 py-3">Profit</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.map((r) => (
                            <tr key={r.menuItemName} className={tableRowClass}>
                              <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{r.menuItemName}</td>
                              <td className="px-4 py-3">{r.totalOrders}</td>
                              <td className="px-4 py-3">{formatCurrency(r.sellingPrice)}</td>
                              <td className="px-4 py-3">{formatCurrency(r.foodCost)}</td>
                              <td className="px-4 py-3">{formatCurrency(r.profitMargin)}</td>
                              <td className="px-4 py-3">{r.classification}</td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => {
                                    const rec = generateRecommendation(r)
                                    setModal({ open: true, title: `Recommendation — ${r.menuItemName}`, body: rec })
                                  }}
                                  className="rounded-2xl bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100"
                                >
                                  Recommend
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">
                      No performance data available for the selected range.
                    </div>
                  )}
                </div>

                <div className="mt-4 grid gap-3">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Category guide</h3>
                  <div className="grid gap-2">
                    {Object.keys(categoryMeta).map((k) => (
                      <div key={k} className="flex items-start gap-3">
                        <div style={{ width: 12, height: 12, background: categoryMeta[k].fill, borderRadius: 4, marginTop: 6 }} />
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{categoryMeta[k].label}</div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">{categoryMeta[k].description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <aside className="space-y-8">
                <div className="rounded-[32px] bg-white dark:bg-slate-900 p-8 shadow-[0_30px_60px_rgba(15,76,129,0.08)] dark:shadow-[0_30px_60px_rgba(0,0,0,0.35)]">
                  <div className="flex items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Insights</p>
                      <h2 className="mt-2 flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                        <SmartAdviceIcon className="h-7 w-7 shrink-0 text-emerald-600" />
                        Smart advice
                      </h2>
                    </div>
                    <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-4 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      {alerts.length} messages
                    </span>
                  </div>

                  <div className="mt-8 space-y-4">
                    {alerts.length ? (
                      alerts.map((alert, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => openRecommendationForAlert(alert)}
                          className="w-full text-left rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-5 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800"
                        >
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{alert.severity || 'Insight'}</p>
                          <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
                            {((alert.message || alert.text || 'No description provided.').length > 100
                              ? (alert.message || alert.text).slice(0, 97) + '...'
                              : alert.message || alert.text)}
                          </p>
                          <div className="mt-3 text-xs text-emerald-700 dark:text-emerald-300 font-semibold">View details</div>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-5 py-8 text-center text-slate-500 dark:text-slate-400">
                        No alerts available right now.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[32px] bg-white dark:bg-slate-900 p-8 shadow-[0_30px_60px_rgba(15,76,129,0.08)] dark:shadow-[0_30px_60px_rgba(0,0,0,0.35)]">
                  <div className="flex items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Quick summary</p>
                      <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Current status</h2>
                    </div>
                  </div>

                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl bg-slate-50 dark:bg-slate-800 p-5">
                      <p className="text-sm text-slate-500 dark:text-slate-400">Total SKUs</p>
                      <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">{report.length}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-50 dark:bg-slate-800 p-5">
                      <p className="text-sm text-slate-500 dark:text-slate-400">Alert items</p>
                      <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">{alerts.length}</p>
                    </div>
                  </div>
                </div>
              </aside>
            </section>

            <section className="rounded-[32px] bg-white dark:bg-slate-900 p-8 shadow-[0_30px_60px_rgba(15,76,129,0.08)] dark:shadow-[0_30px_60px_rgba(0,0,0,0.35)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Menu manager</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Menu Items Administration</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    Create, update, and remove menu items, and export a PDF report for manager reviews.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                      type="button"
                      onClick={() => {
                        resetMenuForm();
                        setIsMenuModalOpen(true);
                      }}
                      className="rounded-3xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      New menu item
                    </button>
                  <button
                    type="button"
                    onClick={generateMenuPdf}
                    className="rounded-3xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
                  >
                    Export PDF report
                  </button>
                </div>
              </div>
            {/* CATALOGUL EXTINS PE TOATĂ LĂȚIMEA REZULTAT PRIN EXCLUDEREA FORMULARULUI STRUCTURAL INLINE */}
                <div className="mt-8 rounded-[28px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-6 w-full">
                  <div className={tablePanelHeaderClass}>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Menu catalog</h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Edit or remove menu items from the current selection.</p>
                  </div>
                  <div className="p-6">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-sm text-slate-500 dark:text-slate-400">{menuItems.length} menu item(s)</p>
                    </div>
                    
                    {/* Grid adaptiv pe coloane care face catalogul să arate excelent pe toată lățimea */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {Array.isArray(menuItems) && menuItems.length > 0 ? (
                        menuItems.map((item) => (
                          <div key={item.id} className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 hover:shadow-md transition">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.name}</p>
                                <p className="mt-1 text-sm font-bold text-sky-600 dark:text-sky-400">{formatCurrency(Number(item.sellingPrice || item.price || 0))}</p>
                                {item.recipeIngredients && item.recipeIngredients.length > 0 && (
                                  <p className="mt-2 text-[11px] text-slate-400 italic">
                                    Contains {item.recipeIngredients.length} ingredient(s)
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="mt-5 flex items-center gap-2 border-t border-slate-50 pt-3 dark:border-slate-800">
                              <button
                                type="button"
                                onClick={() => handleEditMenuItem(item)}
                                className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 transition hover:bg-slate-200 dark:hover:bg-slate-700"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMenuItem(item.id)}
                                className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700 dark:text-rose-300 transition hover:bg-rose-100"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full rounded-3xl border border-slate-200 dark:border-slate-700 bg-white px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                          No menu items have been added yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
            </section>
          </div>
        ) : activeSection === 'employees' ? (
          <section className="rounded-[32px] bg-white dark:bg-slate-900 p-8 shadow-[0_30px_60px_rgba(15,76,129,0.08)] dark:shadow-[0_30px_60px_rgba(0,0,0,0.35)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Staff management</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Waiter administration</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  Create, update, and remove waiter accounts. Managers can keep staff credentials and roles in sync.
                </p>
              </div>
              <button
                type="button"
                className="rounded-3xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                onClick={resetUserForm}
              >
                New staff member
              </button>
            </div>

            <div className="mt-8 grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-[28px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-6">
                <form className="space-y-4" onSubmit={handleUserSubmit}>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Username</label>
                    <input
                      name="username"
                      value={userForm.username}
                      onChange={handleUserChange}
                      required
                      className="mt-3 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                    <input
                      name="password"
                      type="password"
                      value={userForm.password}
                      onChange={handleUserChange}
                      className="mt-3 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      placeholder={userForm.id ? 'Leave blank to keep current password' : 'Enter a new password'}
                      {...(!userForm.id && { required: true })}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">First name</label>
                      <input
                        name="firstName"
                        value={userForm.firstName}
                        onChange={handleUserChange}
                        className="mt-3 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Last name</label>
                      <input
                        name="lastName"
                        value={userForm.lastName}
                        onChange={handleUserChange}
                        className="mt-3 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
                    <select
                      name="role"
                      value={userForm.role}
                      onChange={handleUserChange}
                      className="mt-3 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                      <option value="CHELNER">Waiter</option>
                      <option value="MANAGER">Manager</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="submit"
                      className="rounded-3xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                      disabled={userStatus.loading}
                    >
                      {userForm.id ? 'Save changes' : 'Create staff member'}
                    </button>
                    <button
                      type="button"
                      className="rounded-3xl bg-slate-100 dark:bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100 transition hover:bg-slate-200 dark:hover:bg-slate-700"
                      onClick={resetUserForm}
                    >
                      Reset form
                    </button>
                  </div>
                  {userStatus.error && (
                    <div className="rounded-3xl border border-rose-100 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/50 px-4 py-4 text-sm text-rose-700 dark:text-rose-300">
                      {userStatus.error}
                    </div>
                  )}
                  {userStatus.success && (
                    <div className="rounded-3xl border border-emerald-100 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/50 px-4 py-4 text-sm text-emerald-700 dark:text-emerald-300">
                      {userStatus.success}
                    </div>
                  )}
                </form>
              </div>

              <div className={tablePanelClass}>
                <div className={tablePanelHeaderClass}>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Employee list</h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Manage waiter logins and credentials.</p>
                </div>
                <div className="max-h-[520px] overflow-auto">
                  <table className={tableBaseClass}>
                    <thead className={`${tableHeadClass} tracking-[0.18em] text-[11px]`}>
                      <tr>
                        <th className="px-6 py-4">Username</th>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length ? (
                        users.map((userItem) => (
                          <tr key={userItem.id} className={tableRowClass}>
                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{userItem.username}</td>
                            <td className="px-6 py-4">{userItem.firstName} {userItem.lastName}</td>
                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{userItem.role.toLowerCase()}</td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleEditUser(userItem)}
                                  className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 transition hover:bg-slate-200 dark:hover:bg-slate-700"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(userItem.id)}
                                  className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 transition hover:bg-rose-100"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-6 py-6 text-center text-slate-500 dark:text-slate-400">
                            No staff members have been created yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-[32px] bg-white dark:bg-slate-900 p-8 shadow-[0_30px_60px_rgba(15,76,129,0.08)] dark:shadow-[0_30px_60px_rgba(0,0,0,0.35)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Ingredient inventory</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Ingredients & waste tracking</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    Review ingredient stock levels, update pricing and log waste events to keep inventory accurate.
                  </p>
                </div>
                
                {/* Containerul din dreapta care grupează acum un singur badge și butonul */}
                <div className="flex items-center gap-3">
                  <div className="inline-flex rounded-3xl bg-slate-100 dark:bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {ingredientSearch.trim()
                      ? `${filteredIngredients.length} of ${ingredients.length} entries`
                      : `${ingredients.length} entries`}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      resetIngredientForm()
                      setIsIngredientModalOpen(true)
                    }}
                    className="rounded-3xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 whitespace-nowrap"
                  >
                    + Add Ingredient
                  </button>
                </div>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <label className="w-full max-w-md space-y-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Search by name</span>
                <input
                  type="search"
                  value={ingredientSearch}
                  onChange={(event) => setIngredientSearch(event.target.value)}
                  placeholder="e.g. tomato, flour, olive oil…"
                  className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-sky-900"
                />
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click a column header to sort. Click again to reverse order.
              </p>
            </div>

            <div className="mt-4 space-y-4">
              {ingredientStatus.error && (
                <div className="rounded-3xl border border-rose-100 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/50 px-6 py-4 text-sm text-rose-700 dark:text-rose-300">
                  {ingredientStatus.error}
                </div>
              )}
              {ingredientStatus.success && (
                <div className="rounded-3xl border border-emerald-100 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/50 px-6 py-4 text-sm text-emerald-700 dark:text-emerald-300">
                  {ingredientStatus.success}
                </div>
              )}
            </div>

            <div className={tablePanelClass}>
              <div className={tablePanelHeaderClass}>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Ingredient list</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Update unit costs and report spoilage for tracked batches.</p>
              </div>
              <div className="max-h-[640px] overflow-auto">
                <table className={`${tableBaseClass} border-separate border-spacing-0`}>
                  <thead className={`${tableHeadClass} tracking-[0.18em] text-[11px]`}>
                  <tr>
                    {[
                      { key: 'name', label: 'Name' },
                      { key: 'pricePerUnit', label: 'Unit price' },
                      { key: 'inStockQuantity', label: 'In stock' },
                      { key: 'purchasedQuantity', label: 'Purchased' },
                      { key: 'wasteQuantity', label: 'Waste' },
                      { key: 'entranceDate', label: 'Entrance date' },
                      { key: 'expirationDate', label: 'Expires' },
                      { key: 'predictedExitDate', label: 'Predicted exit' },
                      { key: 'realExitDate', label: 'Real exit' },
                    ].map((column) => (
                      <th key={column.key} className={tableHeadCellClass}>
                        <button
                          type="button"
                          onClick={() => handleIngredientSort(column.key)}
                          className="inline-flex items-center gap-1 font-semibold uppercase tracking-[0.18em] transition hover:text-sky-600 dark:hover:text-sky-400"
                        >
                          {column.label}
                          <span className="text-sky-600 dark:text-sky-400">{ingredientSortIndicator(column.key)}</span>
                        </button>
                      </th>
                    ))}
                    <th className={tableHeadCellClass}>Actions</th>
                  </tr>
                </thead>
                  <tbody>
                    {filteredIngredients.length ? (
                      filteredIngredients.map((ingredient) => (
                      <tr id={`row-ingredient-${ingredient.id}`} key={ingredient.id} className={`${tableRowClass} ${getRowBgClass(ingredient)} transition-all duration-300`} >
                          <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{ingredient.name}</td>
                          <td className="px-6 py-4">{formatCurrency(Number(ingredient.pricePerUnit ?? 0))}</td>
                          <td className="px-6 py-4">{ingredient.inStockQuantity} {ingredient.unitOfMeasurement}</td>
                          <td className="px-6 py-4">{ingredient.purchasedQuantity} {ingredient.unitOfMeasurement}</td>
                          <td className="px-6 py-4">{ingredient.wasteQuantity} {ingredient.unitOfMeasurement}</td>
                          <td className="px-6 py-4">{formatDate(ingredient.entranceDate)}</td>
                          <td className="px-6 py-4">{formatDate(ingredient.expirationDate)}</td>
                          <td className="px-6 py-4">{formatDate(ingredient.predictedExitDate)}</td>
                          <td className="px-6 py-4">{formatDate(ingredient.realExitDate)}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleUpdateIngredientPrice(ingredient)}
                                className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 transition hover:bg-slate-200 dark:hover:bg-slate-700"
                              >
                                Update price
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReportIngredientWaste(ingredient)}
                                className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 transition hover:bg-rose-100"
                              >
                                Report waste
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="10" className="px-6 py-6 text-center text-slate-500 dark:text-slate-400">
                          {ingredients.length
                            ? 'No ingredients match your search.'
                            : 'No ingredient batches are available.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
        {modal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setModal({ open: false, title: '', body: null })} />
            <div className="relative z-10 mx-4 max-w-2xl rounded-2xl bg-white p-6 shadow-lg dark:bg-slate-900">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{modal.title}</h3>
                <button onClick={() => setModal({ open: false, title: '', body: null })} className="text-slate-500 dark:text-slate-400">Close</button>
              </div>
              <div className="mt-4 text-sm text-slate-700 dark:text-slate-300">
                {modal.body && modal.body.alert && (
                  <div>
                    <p className="font-semibold">Insight</p>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{modal.body.alert.message || modal.body.alert.text}</p>
                  </div>
                )}
                {modal.body && modal.body.dto && (
                  <div className="mt-3">
                    <p className="font-semibold">Item</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{modal.body.dto.menuItemName}</p>
                    <div className="mt-2 text-sm">
                      <div>Selling price: {formatCurrency(modal.body.dto.sellingPrice)}</div>
                      <div>Food cost: {formatCurrency(modal.body.dto.foodCost)}</div>
                      <div>Orders: {modal.body.dto.totalOrders}</div>
                      <div>Classification: {modal.body.dto.classification}</div>
                    </div>
                    <div className="mt-3 rounded-md bg-slate-50 dark:bg-slate-800 p-3">
                      <p className="font-semibold">Recommendation</p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{modal.body.rec.summary}</p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{modal.body.rec.details}</p>
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">Target price change: {modal.body.rec.actionable.targetPriceChangePct}%</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Target recipe cost reduction: {modal.body.rec.actionable.targetRecipeCostReductionPct}%</div>
                    </div>
                  </div>
                )}
                {modal.body && modal.body.rec && !modal.body.dto && (
                  <div className="mt-3">
                    <p className="font-semibold">Recommendation</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{modal.body.rec.details}</p>
                  </div>
                )}
                {modal.body && modal.body.dto == null && modal.body && modal.body.alert && !modal.body.rec && (
                  <div className="mt-3 text-sm text-slate-600 dark:text-slate-400">No additional data available for this insight.</div>
                )}
              </div>
            </div>
          </div>
        )}
        {isNotificationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Fundal cu Blur (Efectul de sticlă mată extins) */}
            <div 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" 
              onClick={() => setIsNotificationModalOpen(false)} 
            />
            
            {/* Containerul modalului cu Glassmorphism */}
            <div className="relative z-10 w-full max-w-lg rounded-3xl border border-white/20 bg-white/70 p-6 shadow-2xl backdrop-blur-xl dark:border-slate-800/40 dark:bg-slate-900/70 max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200/50 dark:border-slate-700/50">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  System Action Items 
                  <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-2.5 py-0.5 text-xs">
                    {ingredientNotifications.length} items
                  </span>
                </h3>
                <button 
                  onClick={() => setIsNotificationModalOpen(false)} 
                  className="rounded-xl p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition text-sm"
                >
                  Dismiss
                </button>
              </div>

              <div className="mt-4 space-y-3 overflow-y-auto pr-1 flex-1">
                {ingredientNotifications.length ? (
                  ingredientNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif.ingredientId, notif.ingredientName)}
                      className={`group flex items-start justify-between gap-4 rounded-2xl border p-4 cursor-pointer transition shadow-sm hover:scale-[1.01] active:scale-[0.99] ${
                        notif.type === 'red'
                          ? 'border-rose-200/60 bg-rose-50/60 hover:bg-rose-100/70 dark:border-rose-900/40 dark:bg-rose-950/20 dark:hover:bg-rose-950/40'
                          : 'border-amber-200/60 bg-amber-50/60 hover:bg-amber-100/70 dark:border-amber-900/40 dark:bg-amber-950/20 dark:hover:bg-amber-950/40'
                      }`}
                    >
                      <div className="space-y-1">
                        <p className={`text-sm font-semibold ${notif.type === 'red' ? 'text-rose-800 dark:text-rose-300' : 'text-amber-800 dark:text-amber-300'}`}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {notif.description}
                        </p>
                      </div>

                      {/* Butonul de bifat (Done) */}
                      <button
                        type="button"
                        onClick={(e) => handleDismissNotification(e, notif.id)}
                        title="Mark as resolved"
                        className="rounded-xl border border-slate-300/60 bg-white p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 dark:border-slate-700/60 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-400 transition"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    ✨ All tracked items match safe operational parameters!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {isIngredientModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
              onClick={() => setIsIngredientModalOpen(false)} 
            />
            <div className="relative z-10 w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add New Ingredient Batch</h3>
                <button 
                  onClick={() => setIsIngredientModalOpen(false)} 
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-700"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleIngredientSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Ingredient Name</label>
                  <input
                    name="name"
                    type="text"
                    value={ingredientForm.name}
                    onChange={handleIngredientChange}
                    required
                    placeholder="e.g. Fresh Tomatoes"
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Unit Price ($)</label>
                    <input
                      name="pricePerUnit"
                      type="number"
                      step="0.01"
                      value={ingredientForm.pricePerUnit}
                      onChange={handleIngredientChange}
                      required
                      placeholder="0.00"
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Unit of Measure</label>
                    <select
                      name="unitOfMeasurement"
                      value={ingredientForm.unitOfMeasurement}
                      onChange={handleIngredientChange}
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="KG">Kilograms (kg)</option>
                      <option value="G">Grams (g)</option>
                      <option value="L">Liters (l)</option>
                      <option value="BUC">Pieces (buc)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Purchased Qty</label>
                    <input
                      name="purchasedQuantity"
                      type="number"
                      step="0.1"
                      value={ingredientForm.purchasedQuantity}
                      onChange={handleIngredientChange}
                      required
                      placeholder="Total received"
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Current In-Stock Qty</label>
                    <input
                      name="inStockQuantity"
                      type="number"
                      step="0.1"
                      value={ingredientForm.inStockQuantity}
                      onChange={handleIngredientChange}
                      required
                      placeholder="Available now"
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Entrance Date</label>
                    <input
                      name="entranceDate"
                      type="date"
                      value={ingredientForm.entranceDate}
                      onChange={handleIngredientChange}
                      required
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Expiration Date</label>
                    <input
                      name="expirationDate"
                      type="date"
                      value={ingredientForm.expirationDate}
                      onChange={handleIngredientChange}
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setIsIngredientModalOpen(false)}
                    className="rounded-3xl bg-slate-100 dark:bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={ingredientStatus.loading}
                    className="rounded-3xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {ingredientStatus.loading ? 'Saving...' : 'Add Ingredient'}
                  </button>
                </div>

                {ingredientStatus.error && (
                  <div className="rounded-2xl border border-rose-100 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/50 px-4 py-3 text-xs text-rose-700 dark:text-rose-300">
                    {ingredientStatus.error}
                  </div>
                )}
                {ingredientStatus.success && (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/50 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-300">
                    {ingredientStatus.success}
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
              {/* ================= MODAL DEDICAT CONFIGURĂRII SAU CREĂRII PRODUSELOR DIN MENIU ================= */}
        {isMenuModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
              onClick={() => {
                setIsMenuModalOpen(false);
                resetMenuForm();
              }} 
            />
            <div className="relative z-10 w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {menuForm.id ? 'Edit Menu Item Specification' : 'Configure New Menu Item'}
                </h3>
                <button 
                  onClick={() => {
                    setIsMenuModalOpen(false);
                    resetMenuForm();
                  }} 
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-700 text-sm font-medium"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleMenuSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Item Name</label>
                  <input
                    name="name"
                    type="text"
                    value={menuForm.name}
                    onChange={handleMenuChange}
                    required
                    placeholder="e.g. Traditional Cheeseburger"
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Selling Price ($)</label>
                  <input
                    name="sellingPrice"
                    type="number"
                    step="0.01"
                    value={menuForm.sellingPrice}
                    onChange={handleMenuChange}
                    required
                    placeholder="0.00"
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* ================= SECȚIUNE IMPLEMENTARE INTEGRALĂ REȚETAR DINAMIC ================= */}
                <div className="border-t border-slate-200 pt-4 dark:border-slate-700 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recipe Composition</h4>
                      <p className="text-xs text-slate-500">Bind inventory ingredients to compute standard cost metrics.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddIngredientToRecipe}
                      className="text-xs bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-3 py-2 rounded-2xl font-semibold hover:opacity-90 transition"
                    >
                      + Add Item
                    </button>
                  </div>

                                    {/* Listarea rândurilor din tabelul de ingrediente al rețetei cu Search Inline */}
                                    {/* Ingredient listing with automatic conversion to g, ml, pcs */}
                  <div className="space-y-3 max-h-60 overflow-y-visible pr-1">
                    {(menuForm.recipeIngredients || []).map((ri, index) => {
                      const baseUnit = (ri.ingredient?.unitOfMeasurement || '').toUpperCase();
                      
                      // Determine the visual label and the converted integer value
                      let displayUnit = baseUnit;
                      let displayValue = ri.displayQuantity !== undefined ? ri.displayQuantity : (ri.quantityNeeded || 0);

                      if (baseUnit === 'KG') {
                        displayUnit = 'g';
                        if (ri.displayQuantity === undefined && ri.quantityNeeded) {
                          displayValue = Math.round(ri.quantityNeeded * 1000); // From 0.15 kg to 150g
                        }
                      } else if (baseUnit === 'L' || baseUnit === 'LITRU' || baseUnit === 'LITER') {
                        displayUnit = 'ml';
                        if (ri.displayQuantity === undefined && ri.quantityNeeded) {
                          displayValue = Math.round(ri.quantityNeeded * 1000); // From 0.25 L to 250ml
                        }
                      } else if (baseUnit === 'BUC' || baseUnit === 'PIECES' || baseUnit === 'PCS') {
                        displayUnit = 'pcs';
                        if (ri.quantityNeeded) {
                          displayValue = Math.round(ri.quantityNeeded);
                        }
                      }

                      // Cost is accurately calculated based on the base unit price (e.g., price per kg * 0.15kg)
                      const rowCost = ((ri.ingredient?.pricePerUnit || 0) * (ri.quantityNeeded || 0)).toFixed(2);

                      return (
                        <div key={index} className="relative flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl border border-slate-100 dark:border-slate-700/50 overflow-visible">
                          
                          {/* Inline Search Input by Name */}
                          <div className="flex-1 relative">
                            <input
                              type="text"
                              placeholder="Type ingredient name..."
                              value={ri.ingredient?.name || ''}
                              onChange={(e) => {
                                const term = e.target.value;
                                setMenuForm(prev => {
                                  const updated = [...prev.recipeIngredients];
                                  updated[index].ingredient = { ...updated[index].ingredient, name: term, id: null };
                                  return { ...prev, recipeIngredients: updated };
                                });
                              }}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-sky-500"
                            />
                            
                            {/* Search Results Dropdown */}
                            {!ri.ingredient?.id && ri.ingredient?.name?.trim().length > 0 && (
                              <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
                                {ingredients
                                  .filter(ing => ing.name.toLowerCase().includes((ri.ingredient?.name || '').toLowerCase()))
                                  .map(ing => (
                                    <button
                                      key={ing.id}
                                      type="button"
                                      onClick={() => {
                                        handleRecipeIngredientChange(index, ing.id);
                                        // Reset temporary display value when changing the ingredient
                                        setMenuForm(prev => {
                                          const updated = [...prev.recipeIngredients];
                                          delete updated[index].displayQuantity;
                                          return { ...prev, recipeIngredients: updated };
                                        });
                                      }}
                                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex justify-between"
                                    >
                                      <span>{ing.name}</span>
                                      <span className="text-slate-400 font-semibold uppercase">
                                        {ing.unitOfMeasurement === 'KG' ? 'g' : (ing.unitOfMeasurement === 'L' || ing.unitOfMeasurement === 'LITRU' || ing.unitOfMeasurement === 'LITER') ? 'ml' : 'pcs'}
                                      </span>
                                    </button>
                                  ))}
                                {ingredients.filter(ing => ing.name.toLowerCase().includes((ri.ingredient?.name || '').toLowerCase())).length === 0 && (
                                  <div className="px-3 py-2 text-xs text-slate-400 italic">No ingredients found</div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Quantity Input forced to INTEGER */}
                          <div className="w-28 relative flex items-center">
                            <input
                              type="number"
                              step="1" /* Natively blocks decimal stepper arrows */
                              placeholder="0"
                              value={displayValue || ''}
                              onChange={(e) => handleRecipeQuantityChange(index, e.target.value)}
                              onKeyDown={(e) => {
                                // Prevent users from typing periods or commas for decimals
                                if (e.key === '.' || e.key === ',') {
                                  e.preventDefault();
                                }
                              }}
                              className="w-full rounded-xl border border-slate-200 bg-white pl-3 pr-10 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 font-semibold"
                            />
                            <span className="absolute right-2 text-[10px] text-slate-500 font-bold bg-slate-200/60 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                              {displayUnit.toLowerCase()}
                            </span>
                          </div>

                          {/* Total cost dynamically calculated based on KG/L fractions */}
                          <div className="w-16 text-right font-bold text-slate-700 dark:text-slate-300 text-xs">
                            ${rowCost}
                          </div>

                          {/* Remove ingredient from recipe */}
                          <button
                            type="button"
                            onClick={() => handleRemoveIngredientFromRecipe(index)}
                            className="text-slate-400 hover:text-rose-600 transition px-2 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}

                    {(!menuForm.recipeIngredients || menuForm.recipeIngredients.length === 0) && (
                      <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                        No base recipe attached. Raw material default production cost is $0.00.
                      </p>
                    )}
                  </div>

                  {/* Indicator Total Food Cost */}
                  <div className="mt-3 flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400">Total Production Cost:</span>
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">${calculateTotalRecipeCost()}</span>
                  </div>
                </div>

                {/* Zona de acțiuni inferioară din modal */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuModalOpen(false);
                      resetMenuForm();
                    }}
                    className="rounded-3xl bg-slate-100 dark:bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={menuStatus.loading}
                    className="rounded-3xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {menuStatus.loading ? 'Processing...' : menuForm.id ? 'Save changes' : 'Create item'}
                  </button>
                </div>

                {menuStatus.error && (
                  <div className="rounded-2xl border border-rose-100 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/50 px-4 py-3 text-xs text-rose-700 dark:text-rose-300">
                    {menuStatus.error}
                  </div>
                )}
                {menuStatus.success && (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/50 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-300">
                    {menuStatus.success}
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
    </div>
  )
}

export default ManagerDashboard
