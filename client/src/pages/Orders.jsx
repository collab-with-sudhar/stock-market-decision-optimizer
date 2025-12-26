import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import DashboardLayout from '../components/DashboardLayout';
import { fetchOrdersStart, fetchOrdersSuccess, fetchOrdersFailure } from '../redux/ordersSlice';
import axiosInstance from '../api/axiosInstance';

const Orders = () => {
  const dispatch = useDispatch();
  const { orders, loading, error } = useSelector((state) => state.orders);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterSide, setFilterSide] = useState('ALL');

  useEffect(() => {
    const fetchOrders = async () => {
      dispatch(fetchOrdersStart());
      try {
        const response = await axiosInstance.get('/trading/orders');
        if (response.data?.success) {
          dispatch(fetchOrdersSuccess(response.data.orders || []));
        } else {
          throw new Error(response.data?.message || 'Failed to fetch orders');
        }
      } catch (error) {
        dispatch(fetchOrdersFailure(error.message));
      }
    };

    fetchOrders();
  }, [dispatch]);

  const filteredOrders = orders.filter((order) => {
    if (filterStatus !== 'ALL' && order.status !== filterStatus) return false;
    if (filterSide !== 'ALL' && order.side !== filterSide) return false;
    return true;
  });

  const totalOrders = orders.length;
  const filledOrders = orders.filter((o) => o.status === 'FILLED').length;
  const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED').length;
  const buyOrders = orders.filter((o) => o.side === 'BUY').length;
  const sellOrders = orders.filter((o) => o.side === 'SELL').length;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-landing-text dark:text-white mb-2">
              Order Management
            </h1>
            <p className="text-sm text-landing-muted">
              View and manage all your trading orders
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs font-medium text-landing-muted">Live Updates</span>
          </div>
        </div>

        {}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-[#211A1A] rounded-2xl p-5 shadow-lg border border-landing-primary/10">
            <div className="flex items-center justify-between mb-3">
              <span className="material-symbols-outlined text-landing-primary text-2xl">receipt_long</span>
              <span className="text-xs text-landing-muted uppercase tracking-wider">Total</span>
            </div>
            <p className="text-3xl font-bold text-landing-text dark:text-white">{totalOrders}</p>
            <p className="text-xs text-landing-muted mt-1">All Orders</p>
          </div>

          <div className="bg-white dark:bg-[#211A1A] rounded-2xl p-5 shadow-lg border border-green-500/20">
            <div className="flex items-center justify-between mb-3">
              <span className="material-symbols-outlined text-green-500 text-2xl">check_circle</span>
              <span className="text-xs text-landing-muted uppercase tracking-wider">Filled</span>
            </div>
            <p className="text-3xl font-bold text-green-500">{filledOrders}</p>
            <p className="text-xs text-landing-muted mt-1">Executed</p>
          </div>

          <div className="bg-white dark:bg-[#211A1A] rounded-2xl p-5 shadow-lg border border-red-500/20">
            <div className="flex items-center justify-between mb-3">
              <span className="material-symbols-outlined text-red-500 text-2xl">cancel</span>
              <span className="text-xs text-landing-muted uppercase tracking-wider">Cancelled</span>
            </div>
            <p className="text-3xl font-bold text-red-500">{cancelledOrders}</p>
            <p className="text-xs text-landing-muted mt-1">Rejected</p>
          </div>

          <div className="bg-white dark:bg-[#211A1A] rounded-2xl p-5 shadow-lg border border-blue-500/20">
            <div className="flex items-center justify-between mb-3">
              <span className="material-symbols-outlined text-blue-500 text-2xl">trending_up</span>
              <span className="text-xs text-landing-muted uppercase tracking-wider">Buy</span>
            </div>
            <p className="text-3xl font-bold text-blue-500">{buyOrders}</p>
            <p className="text-xs text-landing-muted mt-1">Orders</p>
          </div>

          <div className="bg-white dark:bg-[#211A1A] rounded-2xl p-5 shadow-lg border border-orange-500/20">
            <div className="flex items-center justify-between mb-3">
              <span className="material-symbols-outlined text-orange-500 text-2xl">trending_down</span>
              <span className="text-xs text-landing-muted uppercase tracking-wider">Sell</span>
            </div>
            <p className="text-3xl font-bold text-orange-500">{sellOrders}</p>
            <p className="text-xs text-landing-muted mt-1">Orders</p>
          </div>
        </div>

        {}
        <div className="bg-white dark:bg-[#211A1A] rounded-2xl p-5 shadow-lg border border-landing-primary/10">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-landing-muted uppercase tracking-wider mb-2">
                Filter by Status
              </label>
              <div className="flex gap-2 flex-wrap">
                {['ALL', 'FILLED', 'CREATED', 'CANCELLED'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filterStatus === status
                      ? 'bg-landing-primary text-white shadow-md'
                      : 'bg-landing-primary/5 text-landing-muted hover:bg-landing-primary/10'
                      }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1">
              <label className="block text-xs font-semibold text-landing-muted uppercase tracking-wider mb-2">
                Filter by Side
              </label>
              <div className="flex gap-2 flex-wrap">
                {['ALL', 'BUY', 'SELL'].map((side) => (
                  <button
                    key={side}
                    onClick={() => setFilterSide(side)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filterSide === side
                      ? 'bg-landing-primary text-white shadow-md'
                      : 'bg-landing-primary/5 text-landing-muted hover:bg-landing-primary/10'
                      }`}
                  >
                    {side}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {}
        <div className="bg-white dark:bg-[#211A1A] rounded-2xl shadow-lg border border-landing-primary/10 overflow-hidden">
          <div className="p-5 border-b border-landing-primary/10">
            <h2 className="text-lg font-bold text-landing-text dark:text-white">
              Order History
            </h2>
            <p className="text-xs text-landing-muted mt-1">
              Showing {filteredOrders.length} of {totalOrders} orders
            </p>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-landing-primary border-r-transparent"></div>
              <p className="text-sm text-landing-muted mt-4">Loading orders...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-red-500 text-4xl mb-2">error</span>
              <p className="text-sm text-red-500">{error}</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-landing-muted text-4xl mb-2">inbox</span>
              <p className="text-sm text-landing-muted">No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-landing-primary/5">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-landing-text dark:text-white uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-landing-text dark:text-white uppercase tracking-wider">
                      Symbol
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-landing-text dark:text-white uppercase tracking-wider">
                      Side
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-landing-text dark:text-white uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-landing-text dark:text-white uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-landing-text dark:text-white uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-landing-text dark:text-white uppercase tracking-wider">
                      Brokerage
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-landing-text dark:text-white uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-landing-text dark:text-white uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-landing-primary/10">
                  {filteredOrders.map((order) => (
                    <tr key={order._id} className="hover:bg-landing-primary/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-landing-muted">
                          {order.orderId?.slice(0, 8)}...
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-landing-text dark:text-white">
                          {order.symbol}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${order.side === 'BUY'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                            }`}
                        >
                          {order.side}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-semibold text-landing-text dark:text-white">
                          {order.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-mono text-landing-text dark:text-white">
                          ₹{order.price?.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-mono font-semibold text-landing-text dark:text-white">
                          ₹{(order.price * order.quantity)?.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-mono text-landing-muted">
                          ₹{Number(order.brokerage || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${order.status === 'FILLED'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : order.status === 'CANCELLED'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                            }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-landing-muted">
                          <div>{new Date(order.createdAt).toLocaleDateString()}</div>
                          <div className="text-xs font-mono">
                            {new Date(order.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
};

export default Orders;
