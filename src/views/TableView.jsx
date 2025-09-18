import {BackIcon} from '../icons';

function TableView({onBack}) {
    return (
        <div className="w-full max-w-4x1 mx-auto">
            <header className="flex items-center mb-6">
                <button onClick={onBack} className='p-2 rounded-full hover:bg-gray-200 mr-4'>
                    <BackIcon />
                </button>
                <div>
                    <h2 className='text-x1 sm:text-2x1 font-bold text-gray-800'>Tabla de Horarios</h2>
                    <p className='text-gray-500'>Aqui se vera los horarios de empleados</p>
                </div>
            </header>
        </div>
    );
}

export default TableView;