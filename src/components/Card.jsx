function Card({title, icon}) {

    return (
        <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-transform hover:translate-y-[-5px]">
            <div className="text-indigo-500 mb-3">
                {icon}
            </div>
            <h3 className="font-semibold text-gray-700">{title}</h3>
        </div>
    );
}

export default Card;