'use client';

import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { FormField, Button, Card } from '@/components/ui/FormComponents';

interface UserFormData {
  nombreApellido: string;
  ruc: string;
  estado: string;
  obligadoContabilidad: string;
  agenteRetencion: string;
  telefono: string;
  correo: string;
  direccion: string;
  actividadesEconomicas: string;
  obligacionesTributarias: string[];
}

const estadoOptions = [
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'INACTIVO', label: 'Inactivo' },
];

const obligadoContabilidadOptions = [
  { value: 'SI', label: 'Sí' },
  { value: 'NO', label: 'No' },
];

const agenteRetencionOptions = [
  { value: 'SI', label: 'Sí' },
  { value: 'NO', label: 'No' },
];

const obligacionesTributariasOptions = [
  { value: 'MENSUAL', label: 'Mensual' },
  { value: 'SEMESTRAL', label: 'Semestral' },
  { value: 'RIMPE_NEGOCIO_POPULAR', label: 'RIMPE Negocio Popular (Anual)' },
];

export default function UsuariosPage() {
  const [formData, setFormData] = useState<UserFormData>({
    nombreApellido: '',
    ruc: '',
    estado: '',
    obligadoContabilidad: '',
    agenteRetencion: '',
    telefono: '',
    correo: '',
    direccion: '',
    actividadesEconomicas: '',
    obligacionesTributarias: [],
  });

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [registrationMethod, setRegistrationMethod] = useState<'manual' | 'pdf'>('manual');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleObligacionesChange = (obligation: string) => {
    setFormData(prev => ({
      ...prev,
      obligacionesTributarias: prev.obligacionesTributarias.includes(obligation)
        ? prev.obligacionesTributarias.filter(o => o !== obligation)
        : [...prev.obligacionesTributarias, obligation]
    }));
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Datos del formulario:', formData);
    console.log('Archivo PDF:', pdfFile);
    // Aquí iría la lógica para enviar los datos al backend
    alert('Usuario registrado exitosamente!');
  };

  const loadDataFromPdf = () => {
    // Simulación de carga de datos desde PDF
    if (pdfFile) {
      setFormData({
        nombreApellido: 'ONTIVEROS TERAN ANDRES ALEJANDRO',
        ruc: '0962428348001',
        estado: 'ACTIVO',
        obligadoContabilidad: 'NO',
        agenteRetencion: 'NO',
        telefono: '0998854591',
        correo: 'andres.ontiveros24@gmail.com',
        direccion: 'COLA ALBORADA, ETAPA IV Número: SOLA 001 Conjunto: CONDOMINIO APANOR Bloque: 409',
        actividadesEconomicas: 'M7491001 - PRESTACION DE SERVICIOS PROFESIONALES',
        obligacionesTributarias: ['SEMESTRAL'],
      });
      alert('Datos cargados desde el PDF del RUC');
    }
  };

  return (
    <MainLayout 
      title="Registro de Usuario" 
      subtitle="Registro de contribuyentes del RUC con datos tributarios"
    >
      <div className="max-w-4xl mx-auto">
        {/* Método de Registro */}
        <Card title="Método de Registro" className="mb-6">
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="registrationMethod"
                value="manual"
                checked={registrationMethod === 'manual'}
                onChange={(e) => setRegistrationMethod(e.target.value as 'manual' | 'pdf')}
                className="mr-2"
              />
              <span>Registro Manual</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="registrationMethod"
                value="pdf"
                checked={registrationMethod === 'pdf'}
                onChange={(e) => setRegistrationMethod(e.target.value as 'manual' | 'pdf')}
                className="mr-2"
              />
              <span>Cargar desde PDF del RUC</span>
            </label>
          </div>
        </Card>

        {/* Carga de PDF */}
        {registrationMethod === 'pdf' && (
          <Card title="Cargar PDF del RUC" className="mb-6">
            <div className="space-y-4">
              <FormField
                label="Archivo PDF del RUC"
                name="pdfFile"
                type="file"
                onChange={handlePdfUpload}
              />
              {pdfFile && (
                <div className="flex items-center space-x-4">
                  <p className="text-sm text-gray-600">Archivo: {pdfFile.name}</p>
                  <Button onClick={loadDataFromPdf}>
                    Cargar Datos desde PDF
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Formulario de Registro */}
        <form onSubmit={handleSubmit}>
          <Card title="Datos del Contribuyente">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Nombre y Apellido"
                name="nombreApellido"
                value={formData.nombreApellido}
                onChange={handleInputChange}
                required
                placeholder="Ingrese nombre y apellido completo"
              />

              <FormField
                label="RUC"
                name="ruc"
                value={formData.ruc}
                onChange={handleInputChange}
                required
                placeholder="Ej: 0962428348001"
              />

              <FormField
                label="Estado"
                name="estado"
                type="select"
                value={formData.estado}
                onChange={handleInputChange}
                options={estadoOptions}
                required
              />

              <FormField
                label="Obligado a llevar contabilidad"
                name="obligadoContabilidad"
                type="select"
                value={formData.obligadoContabilidad}
                onChange={handleInputChange}
                options={obligadoContabilidadOptions}
                required
              />

              <FormField
                label="Agente de retención"
                name="agenteRetencion"
                type="select"
                value={formData.agenteRetencion}
                onChange={handleInputChange}
                options={agenteRetencionOptions}
                required
              />

              <FormField
                label="Teléfono"
                name="telefono"
                type="tel"
                value={formData.telefono}
                onChange={handleInputChange}
                placeholder="Ej: 0998854591"
              />

              <FormField
                label="Correo Electrónico"
                name="correo"
                type="email"
                value={formData.correo}
                onChange={handleInputChange}
                placeholder="ejemplo@correo.com"
              />
            </div>

            <FormField
              label="Dirección"
              name="direccion"
              type="textarea"
              value={formData.direccion}
              onChange={handleInputChange}
              placeholder="Dirección completa del contribuyente"
            />

            <FormField
              label="Actividades Económicas"
              name="actividadesEconomicas"
              type="textarea"
              value={formData.actividadesEconomicas}
              onChange={handleInputChange}
              placeholder="Ej: M7491001 - PRESTACION DE SERVICIOS PROFESIONALES"
            />

            {/* Obligaciones Tributarias */}
            <div className="mb-4">
              <label className="form-label">
                Obligaciones Tributarias <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="space-y-2">
                {obligacionesTributariasOptions.map((option) => (
                  <label key={option.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.obligacionesTributarias.includes(option.value)}
                      onChange={() => handleObligacionesChange(option.value)}
                      className="mr-2"
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex space-x-4 mt-6">
              <Button type="submit" variant="primary">
                Registrar Usuario
              </Button>
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => {
                  setFormData({
                    nombreApellido: '',
                    ruc: '',
                    estado: '',
                    obligadoContabilidad: '',
                    agenteRetencion: '',
                    telefono: '',
                    correo: '',
                    direccion: '',
                    actividadesEconomicas: '',
                    obligacionesTributarias: [],
                  });
                  setPdfFile(null);
                }}
              >
                Limpiar Formulario
              </Button>
            </div>
          </Card>
        </form>

        {/* Información Adicional */}
        <Card title="Información Importante" className="mt-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Nota sobre obligaciones tributarias:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Mensual:</strong> Declaración de IVA cada mes</li>
              <li>• <strong>Semestral:</strong> Declaración cada 6 meses</li>
              <li>• <strong>RIMPE Negocio Popular:</strong> Declaración anual para pequeños negocios</li>
              <li>• Si está obligado a llevar contabilidad, este software no aplicará</li>
            </ul>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
