import React from 'react';
function PinPad({ pin, setPin, maxLength = 4 }) {
  const handleKeyClick = (key) => { if (pin.length < maxLength) setPin(pin + key); };
  const handleDelete = () => { setPin(pin.slice(0, -1)); };
  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-center space-x-3 mb-6">
        {Array(maxLength).fill(0).map((_, i) => (
          <div key={i} className={`w-4 h-4 rounded-full transition-colors ${i < pin.length ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button type="button" key={num} onClick={() => handleKeyClick(String(num))} className="w-16 h-16 rounded-full bg-gray-100 text-2xl font-semibold text-gray-700 flex items-center justify-center transform transition-transform active:scale-90 hover:bg-gray-200">{num}</button>
        ))}
        <div />
        <button type="button" onClick={() => handleKeyClick('0')} className="w-16 h-16 rounded-full bg-gray-100 text-2xl font-semibold text-gray-700 flex items-center justify-center transform transition-transform active:scale-90 hover:bg-gray-200">0</button>
        <button type="button" onClick={handleDelete} className="w-16 h-16 rounded-full text-xl font-semibold text-gray-700 flex items-center justify-center">Borrar</button>
      </div>
    </div>
  );
}
export default PinPad;