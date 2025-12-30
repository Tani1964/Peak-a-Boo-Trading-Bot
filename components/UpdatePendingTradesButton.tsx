import { useCallback } from 'react';

const UpdatePendingTradesButton = () => {
  const handleUpdate = useCallback(async () => {
    try {
      const res = await fetch('/api/trades/update-pending', { method: 'POST' });
      const data = await res.json();
      alert(`Updated ${data.updated} pending trades.`);
    } catch (e) {
      alert('Failed to update pending trades.');
    }
  }, []);

  return (
    <button
      onClick={handleUpdate}
      className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-bold hover:bg-yellow-600 shadow-md mt-2 mb-4"
    >
      Update Pending Trades
    </button>
  );
};

export default UpdatePendingTradesButton;
