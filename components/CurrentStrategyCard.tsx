import useSWR from 'swr';

const CurrentStrategyCard = () => {
  const { data, error, isLoading } = useSWR('/api/strategy/current', (url) => fetch(url).then(res => res.json()));

  if (isLoading) {
    return <div className="bg-white rounded-lg shadow-md p-6 mb-4">Loading current strategy...</div>;
  }
  if (error || !data) {
    return <div className="bg-white rounded-lg shadow-md p-6 mb-4 text-red-600">Failed to load current strategy.</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4">
      <h2 className="text-xl font-bold mb-2">Current Strategy</h2>
      <div className="mb-2">
        <span className="font-semibold">Stock Symbol:</span>
        <span className="ml-2 text-blue-700 font-mono">{data.symbol}</span>
      </div>
      <div className="mb-2">
        <span className="font-semibold">Action:</span>
        <span className="ml-2 text-green-700 font-bold uppercase">{data.action}</span>
      </div>
      <div className="mb-2">
        <span className="font-semibold">Price:</span>
        <span className="ml-2 text-gray-700">${data.price}</span>
      </div>
      <div className="mb-2">
        <span className="font-semibold">Time:</span>
        <span className="ml-2 text-gray-700">{new Date(data.time).toLocaleString()}</span>
      </div>
      <div className="mb-2">
        <span className="font-semibold">Why Buy:</span>
        <p className="ml-2 text-gray-700">{data.buyReason}</p>
      </div>
      <div className="mb-2">
        <span className="font-semibold">Expected Holding Period:</span>
        <p className="ml-2 text-gray-700">{data.holdingPeriod}</p>
      </div>
      <div className="mb-2">
        <span className="font-semibold">Indicators:</span>
        <ul className="ml-4 text-gray-700 list-disc">
          <li>RSI: {data.indicators?.rsi}</li>
          <li>MACD: {data.indicators?.macd}</li>
          <li>MACD Signal: {data.indicators?.macdSignal}</li>
          <li>MACD Histogram: {data.indicators?.macdHistogram}</li>
        </ul>
      </div>
      <div className="mb-2">
        <span className="font-semibold">Related News:</span>
        <ul className="ml-4 text-gray-700 list-disc">
          {data.news?.map((item: { url: string; headline: string; sentiment: string }, idx: number) => (
              <li key={idx}>
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{item.headline}</a> <span className="italic text-xs">({item.sentiment})</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <span className="font-semibold">Explanation:</span>
        <p className="ml-2 text-gray-700">{data.explanation}</p>
      </div>
    </div>
  );
};

export default CurrentStrategyCard;
