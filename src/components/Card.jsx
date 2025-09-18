function Card({title, icon, color}) {
    const colorClass = `text-${color}-500`;

    return (
        <div className="bg-white p-6 rounded-2x1 shadow-md flex flex-col item-center justify-center text-center cursor-pointer transition-transform hover:translate-y-[-5px] hover:shadow-lg">
            <div className={`mb-3 ${colorClass}`}>
                {icon}
            </div>
            <h3 className="font-semibold text-gray-700">{title}</h3>
        </div>
    );
}

export default Card;