function Timer({ timeLeft }) {
  if (timeLeft === undefined || timeLeft === null) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
      <span>{timeLeft}s</span>
    </div>
  );
}

export default Timer;
