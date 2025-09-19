import {BackIcon, DownloadIcon} from '../icons';

function InvoiceView({onBack, data}) {
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

            <main className='bg-white rounded-2xl p-6 shadow-md'>
                {/* Controles */}
                <section className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-8'>
                    <div>
                        <label htmlFor="invoice-date" className='block text-sm font-medium text-gray-600 mb-1'>Quincena</label>
                        <input type="text" id='invoice-date' readOnly value={data.terms} className='w-full p-2 border border-gray-300 rounded-lg bg-gray-100' />
                    </div>
                    <div>
                        <label htmlFor="invoice-number" className='block text-sm font-medium text-gray-600 mb-1'>Número de factura</label>
                        <input type="number" id='invoice-number' defaultValue={data.invoiceNumber} className='w-full p-2 border border-gray-300 rounded-lg' />
                    </div>
                    <div className='self-end'>
                        <button className='w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 flex items-center justify-center transition-colors'>
                            <DownloadIcon />
                            <span className='ml-2'>Descargar PDF</span>
                        </button>
                    </div>
                </section>

                {/* Tabla de turnos */}
                <section>
                    <div>
                        <table>
                            <thead>
                                <tr>
                                    <th></th>
                                </tr>
                            </thead>

                            <tbody>

                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </div>
    );
}

export default InvoiceView;