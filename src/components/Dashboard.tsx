import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  X,
  Database,
  LogOut,
  User,
  ChevronDown,
  ChevronRight,
  Wifi,
  WifiOff,
  Package,
  Truck,
  Container,
  BookOpen,
  Settings as SettingsIcon,
  DollarSign,
  Boxes,
  Wallet,
  Menu,
  Home,
  ShoppingCart,
  Receipt,
  BarChart3,
  Users
} from 'lucide-react';
import Products from './Products';
import Suppliers from './Suppliers';
import Containers from './Containers';
import SupplierLedger from './SupplierLedger';
import Payments from './Payments';
import Sales from './Sales';
import CashSituation from './CashSituation';
import Expenses from './Expenses';
import Partners from './Partners';
import DashboardHome from './DashboardHome';
import Settings from './Settings';
import Reports from './Reports';
import PageLoader from './PageLoader';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState(() => {
    // Load saved tab from localStorage on mount, default to 'dashboard'
    const savedTab = localStorage.getItem('activeTab');
    const validTabs = ['dashboard', 'products', 'sales', 'suppliers', 'containers', 'cash', 'expenses', 'partners', 'payments', 'ledger', 'reports', 'settings'];

    // If saved tab is valid, use it; otherwise default to 'dashboard'
    if (savedTab && validTabs.includes(savedTab)) {
      return savedTab;
    }
    return 'dashboard';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline] = useState(navigator.onLine);
  const [isLoadingTab, setIsLoadingTab] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    inventory: false,
    finance: false,
  });
  const [showMobileSubmenu, setShowMobileSubmenu] = useState(false);
  const [mobileSubmenuType, setMobileSubmenuType] = useState<'inventory' | 'finance' | null>(null);

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  // Toggle menu expansion
  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  // Handle tab change with loading state
  const handleTabChange = (tabId: string) => {
    if (tabId === activeTab) return;

    setIsLoadingTab(true);
    setActiveTab(tabId);

    // Brief loading to allow data fetching
    setTimeout(() => {
      setIsLoadingTab(false);
    }, 400);
  };

  // Auto-expand parent menu when child is active
  useEffect(() => {
    navigation.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some(child => child.id === activeTab);
        if (hasActiveChild && !expandedMenus[item.id]) {
          setExpandedMenus(prev => ({ ...prev, [item.id]: true }));
        }
      }
    });
  }, [activeTab]);

  // Handle navigation to ledger with supplier preselected
  const handleNavigateToLedger = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    handleTabChange('ledger');
  };

  // Get loading content based on active tab
  const getLoadingContent = () => {
    // First check top-level navigation items
    let tab = navigation.find(item => item.id === activeTab);

    // If not found, search in children
    if (!tab) {
      for (const item of navigation) {
        if (item.children) {
          const childTab = item.children.find(child => child.id === activeTab);
          if (childTab) {
            tab = childTab;
            break;
          }
        }
      }
    }

    const Icon = tab?.icon || LayoutDashboard;
    const tabName = tab?.name || 'Page';

    return {
      title: `Loading ${tabName}`,
      message: `Fetching ${tabName.toLowerCase()} data`,
      icon: (
        <div className="p-4 rounded-xl border-2 border-creed-primary/20" style={{
          backgroundColor: '#151a21'
        }}>
          <Icon className="w-12 h-12 text-creed-primary" />
        </div>
      )
    };
  };

  const handleLogout = () => {
    localStorage.removeItem('github_token');
    window.location.reload();
  };

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'inventory',
      name: 'Inventory',
      icon: Boxes,
      children: [
        { id: 'products', name: 'Products', icon: Package },
        { id: 'sales', name: 'Sales', icon: ShoppingCart },
        { id: 'containers', name: 'Containers', icon: Container },
      ],
    },
    {
      id: 'finance',
      name: 'Finance',
      icon: Wallet,
      children: [
        { id: 'cash', name: 'Cash Situation', icon: Wallet },
        { id: 'expenses', name: 'Expenses', icon: Receipt },
        { id: 'partners', name: 'Partners', icon: Users },
        { id: 'suppliers', name: 'Suppliers', icon: Truck },
        { id: 'payments', name: 'Payments', icon: DollarSign },
        { id: 'ledger', name: 'Supplier Ledger', icon: BookOpen },
      ],
    },
    { id: 'reports', name: 'Reports', icon: BarChart3 },
    { id: 'settings', name: 'Settings', icon: SettingsIcon },
  ];

  // Mobile bottom nav items
  const mobileNavItems = [
    { id: 'dashboard', name: 'Home', icon: Home, type: 'direct' as const },
    {
      id: 'inventory',
      name: 'Inventory',
      icon: Boxes,
      type: 'submenu' as const,
      submenu: [
        { id: 'products', name: 'Products', icon: Package },
        { id: 'sales', name: 'Sales', icon: ShoppingCart },
        { id: 'containers', name: 'Containers', icon: Container },
      ]
    },
    {
      id: 'finance',
      name: 'Finance',
      icon: Wallet,
      type: 'submenu' as const,
      submenu: [
        { id: 'cash', name: 'Cash', icon: Wallet },
        { id: 'expenses', name: 'Expenses', icon: Receipt },
        { id: 'partners', name: 'Partners', icon: Users },
        { id: 'suppliers', name: 'Suppliers', icon: Truck },
        { id: 'payments', name: 'Payments', icon: DollarSign },
        { id: 'ledger', name: 'Ledger', icon: BookOpen },
      ]
    },
    { id: 'reports', name: 'Reports', icon: BarChart3, type: 'direct' as const },
    { id: 'settings', name: 'Settings', icon: SettingsIcon, type: 'direct' as const },
  ];

  // Handle mobile nav click
  const handleMobileNavClick = (item: typeof mobileNavItems[0]) => {
    if (item.type === 'submenu') {
      setMobileSubmenuType(item.id as 'inventory' | 'finance');
      setShowMobileSubmenu(true);
    } else {
      handleTabChange(item.id);
    }
  };

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(to bottom, #0a0e14 0%, #0f1419 50%, #151a21 100%)'
    }}>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 h-16 flex items-center justify-center px-4 backdrop-blur-md border-b" style={{
        backgroundColor: 'rgba(26, 33, 41, 0.95)',
        borderColor: '#2d3748'
      }}>
        <span className="font-display font-bold text-xl text-creed-text-bright">Friperie</span>
      </header>

      {/* Sidebar (Desktop Only) */}
      <aside className="hidden lg:block fixed top-0 left-0 z-40 h-screen">
        <div className="h-full w-56 flex flex-col shadow-card border-r" style={{
          backgroundColor: '#1a2129',
          borderColor: '#2d3748',
          borderWidth: '1px'
        }}>
          {/* Logo */}
          <div className="h-16 flex items-center px-4">
            <span className="font-display font-bold text-xl text-creed-text-bright">Friperie</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isExpanded = expandedMenus[item.id];
              const hasActiveChild = item.children?.some(child => child.id === activeTab);

              if (item.children) {
                // Parent menu with children
                return (
                  <div key={item.id}>
                    <button
                      onClick={() => toggleMenu(item.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all text-sm border ${
                        hasActiveChild
                          ? 'text-creed-text font-medium border-transparent bg-creed-primary/5'
                          : 'text-creed-muted hover:text-creed-text hover:bg-creed-primary/10 border-transparent'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="flex-1 text-left">{item.name}</span>
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>

                    {/* Submenu */}
                    {isExpanded && (
                      <div className="ml-3 mt-1 space-y-1 border-l-2 pl-3" style={{ borderColor: '#2d3748' }}>
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const isChildActive = activeTab === child.id;
                          return (
                            <button
                              key={child.id}
                              onClick={() => handleTabChange(child.id)}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm border ${
                                isChildActive
                                  ? 'text-white font-medium'
                                  : 'text-creed-muted hover:text-creed-text hover:bg-creed-primary/10 border-transparent'
                              }`}
                              style={isChildActive ? {
                                backgroundColor: '#0c1115',
                                borderColor: '#1a2129',
                                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 1px 2px rgba(0,0,0,0.4)'
                              } : undefined}
                            >
                              <ChildIcon className="w-3.5 h-3.5" />
                              <span>{child.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              } else {
                // Single menu item without children
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all text-sm border ${
                      isActive
                        ? 'text-white font-medium'
                        : 'text-creed-muted hover:text-creed-text hover:bg-creed-primary/10 border-transparent'
                    }`}
                    style={isActive ? {
                      backgroundColor: '#0c1115',
                      borderColor: '#1a2129',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 1px 2px rgba(0,0,0,0.4)'
                    } : undefined}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </button>
                );
              }
            })}
          </nav>

          {/* User Profile */}
          <div className="px-3 py-2 relative">
            {/* Dropdown Menu - Positioned Above */}
            {showUserMenu && (
              <div className="absolute bottom-full left-3 right-3 rounded-lg border overflow-hidden shadow-xl z-50" style={{
                backgroundColor: '#151a21',
                borderColor: '#2d3748',
                borderWidth: '1px'
              }}>
                {/* Connection Status */}
                <div className="px-3 py-2 border-b" style={{ borderColor: '#2d3748' }}>
                  <div className={`flex items-center gap-2 ${
                    isOnline ? 'text-creed-success' : 'text-creed-danger'
                  }`}>
                    {isOnline ? (
                      <>
                        <Wifi className="w-3 h-3" />
                        <span className="text-xs font-medium">Online</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3 h-3" />
                        <span className="text-xs font-medium">Offline</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-creed-danger transition-all hover:bg-creed-danger/10"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Logout</span>
                </button>
              </div>
            )}

            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer group transition-all hover:bg-creed-accent/10"
            >
              <div className="p-1.5 rounded-full bg-creed-primary shadow-md">
                <User className="w-3 h-3 text-white" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-medium text-creed-text truncate">Account</p>
                <p className="text-[10px] text-creed-muted">wissamyah</p>
              </div>
              <ChevronDown className={`w-3 h-3 text-creed-muted group-hover:text-creed-text transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-56 pt-16 lg:pt-0 pb-20 lg:pb-0">
        {/* Page Content */}
        <main className="p-6">
          {isLoadingTab ? (
            <PageLoader {...getLoadingContent()} />
          ) : (
            <>
              {activeTab === 'dashboard' && <DashboardHome />}
              {activeTab === 'products' && <Products />}
              {activeTab === 'sales' && <Sales />}
              {activeTab === 'suppliers' && <Suppliers onNavigateToLedger={handleNavigateToLedger} />}
              {activeTab === 'containers' && <Containers />}
              {activeTab === 'cash' && <CashSituation />}
              {activeTab === 'expenses' && <Expenses />}
              {activeTab === 'partners' && <Partners />}
              {activeTab === 'payments' && <Payments />}
              {activeTab === 'ledger' && <SupplierLedger preselectedSupplierId={selectedSupplierId} />}
              {activeTab === 'reports' && <Reports />}
              {activeTab === 'settings' && <Settings />}
              {/* Fallback to dashboard if no tab matches */}
              {!['dashboard', 'products', 'sales', 'suppliers', 'containers', 'cash', 'expenses', 'partners', 'payments', 'ledger', 'reports', 'settings'].includes(activeTab) && <DashboardHome />}
            </>
          )}
        </main>
      </div>

      {/* iOS-style Bottom Navigation (Mobile Only) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 backdrop-blur-xl border-t" style={{
        backgroundColor: 'rgba(26, 33, 41, 0.95)',
        borderColor: '#2d3748',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}>
        <div className="flex items-center justify-around h-16 px-2">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.type === 'direct'
              ? activeTab === item.id
              : item.submenu?.some(sub => sub.id === activeTab);

            return (
              <button
                key={item.id}
                onClick={() => handleMobileNavClick(item)}
                className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all relative"
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full bg-creed-primary" />
                )}

                <div className={`p-1.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-creed-primary/20 scale-110'
                    : 'scale-100'
                }`}>
                  <Icon className={`w-5 h-5 transition-colors ${
                    isActive
                      ? 'text-creed-primary'
                      : 'text-creed-muted'
                  }`} />
                </div>

                <span className={`text-[10px] font-medium transition-colors ${
                  isActive
                    ? 'text-creed-primary'
                    : 'text-creed-muted'
                }`}>
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Submenu Sheet */}
      <div className="lg:hidden">
        {/* Backdrop */}
        <div
          className={`fixed inset-0 bg-black transition-all duration-300 z-40 ${
            showMobileSubmenu
              ? 'bg-opacity-50 backdrop-blur-sm pointer-events-auto'
              : 'bg-opacity-0 backdrop-blur-none pointer-events-none'
          }`}
          onClick={() => setShowMobileSubmenu(false)}
        />

        {/* Slide-up Sheet */}
        <div
          className={`fixed left-0 right-0 z-50 transition-all duration-300 ease-out rounded-t-3xl border-t ${
            showMobileSubmenu
              ? 'bottom-0'
              : '-bottom-full'
          }`}
          style={{
            backgroundColor: '#1a2129',
            borderColor: '#2d3748',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)'
          }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-4">
            <div className="w-12 h-1 rounded-full bg-creed-muted/30" />
          </div>

          {/* Content */}
          <div className="px-6 pb-4">
            <h3 className="text-sm font-semibold text-creed-text uppercase tracking-wide mb-4">
              {mobileSubmenuType === 'inventory' ? 'Inventory' : 'Finance'}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {mobileNavItems
                .find(item => item.id === mobileSubmenuType)
                ?.submenu?.map((subItem) => {
                  const SubIcon = subItem.icon;
                  const isActive = activeTab === subItem.id;

                  return (
                    <button
                      key={subItem.id}
                      onClick={() => {
                        handleTabChange(subItem.id);
                        setShowMobileSubmenu(false);
                      }}
                      className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all ${
                        isActive
                          ? 'border-creed-primary bg-creed-primary/10'
                          : 'border-creed-lighter hover:border-creed-primary/50 hover:bg-creed-primary/5'
                      }`}
                    >
                      <div className={`p-3 rounded-xl ${
                        isActive
                          ? 'bg-creed-primary/20'
                          : 'bg-creed-base'
                      }`}>
                        <SubIcon className={`w-6 h-6 ${
                          isActive
                            ? 'text-creed-primary'
                            : 'text-creed-muted'
                        }`} />
                      </div>
                      <span className={`text-sm font-medium ${
                        isActive
                          ? 'text-creed-primary'
                          : 'text-creed-text'
                      }`}>
                        {subItem.name}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
