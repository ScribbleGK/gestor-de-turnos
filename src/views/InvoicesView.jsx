import {BackIcon} from '../icons';

function InvoiceView({onBack}) {
    return (
        <div className="w-full max-w-4x1 mx-auto">
            <header className="flex items-center mb-6">
                <button onClick={onBack} className='p-2 rounded-full hover:bg-gray-200 mr-4'>
                    <BackIcon />
                </button>
                <div>
                    <h2 className='text-x1 sm:text-2x1 font-bold text-gray-800'>Mis Facturas</h2>
                    <p className='text-gray-500'>Aquí podrás consultar y descargar tus facturas.</p>
                </div>
            </header>
        </div>
    );
}

export default InvoiceView;