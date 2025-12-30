import React from 'react';

interface StrategyCardProps {
  plan: string;
  approach: string;
  reason: string;
}

const StrategyCard: React.FC<StrategyCardProps> = ({ plan, approach, reason }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4">
      <h2 className="text-xl font-bold mb-2">Strategy</h2>
      <div className="mb-2">
        <span className="font-semibold">Plan:</span>
        <p className="ml-2 text-gray-700">{plan}</p>
      </div>
      <div className="mb-2">
        <span className="font-semibold">Approach:</span>
        <p className="ml-2 text-gray-700">{approach}</p>
      </div>
      <div>
        <span className="font-semibold">Reason:</span>
        <p className="ml-2 text-gray-700">{reason}</p>
      </div>
    </div>
  );
};

export default StrategyCard;
