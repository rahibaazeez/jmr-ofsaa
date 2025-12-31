import { useState } from 'react';
import { supabase } from './supabaseClient';

const initialFormState = {
  clientName: '',
  // Stack 1
  componentType: '',
  product: '',
  version: '',
  patch: '',
  certified: '',
  supportStatus: '',
  // Stack 2
  componentType_2: '',
  product_2: '',
  version_2: '',
  patch_2: '',
  certified_2: '',
  supportStatus_2: '',
  // Stack 3
  componentType_3: '',
  product_3: '',
  version_3: '',
  patch_3: '',
  certified_3: '',
  supportStatus_3: '',
  // Other
  notes: '',
  coreComponent: '',
  subApplication: '',
  versionDetails: '',
  vcpu: '',
  ram: '',
  storage: ''
};

function App() {
  const [formData, setFormData] = useState(initialFormState);
  const [notification, setNotification] = useState(null);
  const [logs, setLogs] = useState([]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const sanitizedClient = formData.clientName.replace(/[^a-zA-Z0-9-_]/g, '');

      // Fetch all existing IDs to determine the next global sequence number
      const { data: existingIds, error: fetchError } = await supabase
        .from('stack')
        .select('id');

      if (fetchError) throw fetchError;

      let nextIndex = 1;
      const prefix = sanitizedClient ? `${sanitizedClient}_` : '';

      if (existingIds && existingIds.length > 0) {
        // Filter IDs that start with the current client prefix
        const clientIds = existingIds
          .map(row => row.id)
          .filter(id => id && id.toString().startsWith(prefix));

        const counts = clientIds
          .map(id => {
            const parts = id.split('_');
            const lastPart = parts[parts.length - 1];
            const num = parseInt(lastPart, 10);
            return isNaN(num) ? 0 : num;
          });

        if (counts.length > 0) {
          nextIndex = Math.max(...counts) + 1;
        }
      }

      const customId = `${prefix}${nextIndex}`;

      // Helper to filter payload against actual table columns
      const insertSafe = async (table, data) => {
        const { data: sampleRows } = await supabase.from(table).select('*').limit(1);
        let payload = { ...data };

        if (sampleRows && sampleRows.length > 0) {
          const validColumns = Object.keys(sampleRows[0]);
          const filtered = {};
          Object.keys(payload).forEach(key => {
            if (validColumns.includes(key)) filtered[key] = payload[key];
          });
          payload = filtered;
        }

        console.log(`Inserting into ${table}:`, payload);
        const { error } = await supabase.from(table).insert([payload]);
        if (error) throw error;
      };

      // 1. Insert into Main Stack Table
      // 1. Prepare Stack Payloads (Handle up to 3 sets)
      const stacks = [
        { suffix: '', data: { componentType: formData.componentType, product: formData.product, version: formData.version, patch: formData.patch, certified: formData.certified, supportStatus: formData.supportStatus } },
        { suffix: '_2', data: { componentType: formData['componentType_2'], product: formData['product_2'], version: formData['version_2'], patch: formData['patch_2'], certified: formData['certified_2'], supportStatus: formData['supportStatus_2'] } },
        { suffix: '_3', data: { componentType: formData['componentType_3'], product: formData['product_3'], version: formData['version_3'], patch: formData['patch_3'], certified: formData['certified_3'], supportStatus: formData['supportStatus_3'] } }
      ];

      // Insert Stacks sequentially
      let currentIdIndex = nextIndex;

      for (const stack of stacks) {
        // Skip if componentType is empty as a basic check
        if (!stack.data.componentType) continue;

        const thisId = `${prefix}${currentIdIndex}`;

        const stackPayload = {
          id: thisId,
          clientName: formData.clientName,
          ...stack.data,
          notes: formData.notes
        };

        await insertSafe('stack', stackPayload);
        currentIdIndex++; // Increment for next stack entry
      }

      // Use the FIRST ID for the component details (or creating separate details? User only has one Component Details section currently)
      // Assuming Component Details belongs to the overall Client request, we might just attach it to the first ID or all?
      // For now, let's attach it to the first generated ID to be safe.
      const primaryId = `${prefix}${nextIndex}`;

      // 2. Insert into Component Details Table
      // 2. Insert into Component Details Table (Linked to primary ID)
      const detailsPayload = {
        id: primaryId,
        coreComponent: formData.coreComponent,
        subApplication: formData.subApplication,
        versionDetails: formData.versionDetails,
        vcpu: formData.vcpu,
        ram: formData.ram,
        storage: formData.storage
      };

      try {
        await insertSafe('component', detailsPayload);
      } catch (detailError) {
        console.warn('Could not insert into details table:', detailError);
      }

      showNotification(`Record created `, 'success');
      resetForm();
    } catch (error) {
      console.error('Error saving record:', error);
    }
  };

  const resetForm = () => {
    setFormData(initialFormState);
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="app-container">
      {notification && (
        <div className={`notification ${notification.type}`} style={{
          position: 'fixed', top: '20px', right: '20px',
          background: notification.type === 'error' ? '#ef4444' : '#10b981',
          color: 'white', padding: '1rem', borderRadius: '8px', zIndex: 1000
        }}>
          {notification.message}
        </div>
      )}

      <header className="title-bar">
        <div>
          <h1>OFSAA Unified Manager</h1>
          <p style={{ color: 'var(--text-muted)' }}>Add new stack and component data efficiently.</p>
        </div>
      </header>

      <div className="glass-panel">
        <h2 style={{ marginBottom: '1.5rem' }}>Add New Record</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label>Client Name</label>
            <input name="clientName" value={formData.clientName} onChange={handleInputChange} placeholder="e.g. Client X" autoFocus />
          </div>

          <h3 style={{ marginTop: '1rem', fontSize: '1.2rem', color: 'var(--primary-color)' }}>Stack Information</h3>
          <div className="form-grid">
            <div>
              <label>Component Type</label>
              <input name="componentType" value={formData.componentType} onChange={handleInputChange} placeholder="e.g. Operating System" />
            </div>
            <div>
              <label>Product</label>
              <input name="product" value={formData.product} onChange={handleInputChange} placeholder="e.g. Oracle Solaris" />
            </div>
            <div>
              <label>Version</label>
              <input name="version" value={formData.version} onChange={handleInputChange} placeholder="e.g. 11.4" />
            </div>
            <div>
              <label>Patch / PSU/RU</label>
              <input name="patch" value={formData.patch} onChange={handleInputChange} />
            </div>
            <div>
              <label>Certified</label>
              <select name="certified" value={formData.certified} onChange={handleInputChange}>
                <option value="">Select...</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label>Support Status</label>
              <select name="supportStatus" value={formData.supportStatus} onChange={handleInputChange}>
                <option value="">Select...</option>
                <option value="Supported">Supported</option>
                <option value="Sustaining Support">Sustaining Support</option>
                <option value="Not Supported">Not Supported</option>
              </select>
            </div>
          </div>

          <h3 style={{ marginTop: '1rem', fontSize: '1.2rem', color: 'var(--primary-color)' }}>Stack Information</h3>
          <div className="form-grid">
            <div>
              <label>Component Type</label>
              <input name="componentType_2" value={formData.componentType_2} onChange={handleInputChange} placeholder="e.g. Database" />
            </div>
            <div>
              <label>Product</label>
              <input name="product_2" value={formData.product_2} onChange={handleInputChange} />
            </div>
            <div>
              <label>Version</label>
              <input name="version_2" value={formData.version_2} onChange={handleInputChange} />
            </div>
            <div>
              <label>Patch / PSU/RU</label>
              <input name="patch_2" value={formData.patch_2} onChange={handleInputChange} />
            </div>
            <div>
              <label>Certified</label>
              <select name="certified_2" value={formData.certified_2} onChange={handleInputChange}>
                <option value="">Select...</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label>Support Status</label>
              <select name="supportStatus_2" value={formData.supportStatus_2} onChange={handleInputChange}>
                <option value="">Select...</option>
                <option value="Supported">Supported</option>
                <option value="Sustaining Support">Sustaining Support</option>
                <option value="Not Supported">Not Supported</option>
              </select>
            </div>
          </div>

          <h3 style={{ marginTop: '1rem', fontSize: '1.2rem', color: 'var(--primary-color)' }}>Stack Information</h3>
          <div className="form-grid">
            <div>
              <label>Component Type</label>
              <input name="componentType_3" value={formData.componentType_3} onChange={handleInputChange} placeholder="e.g. Middleware" />
            </div>
            <div>
              <label>Product</label>
              <input name="product_3" value={formData.product_3} onChange={handleInputChange} />
            </div>
            <div>
              <label>Version</label>
              <input name="version_3" value={formData.version_3} onChange={handleInputChange} />
            </div>
            <div>
              <label>Patch / PSU/RU</label>
              <input name="patch_3" value={formData.patch_3} onChange={handleInputChange} />
            </div>
            <div>
              <label>Certified</label>
              <select name="certified_3" value={formData.certified_3} onChange={handleInputChange}>
                <option value="">Select...</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label>Support Status</label>
              <select name="supportStatus_3" value={formData.supportStatus_3} onChange={handleInputChange}>
                <option value="">Select...</option>
                <option value="Supported">Supported</option>
                <option value="Sustaining Support">Sustaining Support</option>
                <option value="Not Supported">Not Supported</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label>Notes / Remarks</label>
            <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="3"></textarea>
          </div>

          <h3 style={{ marginTop: '2rem', fontSize: '1.2rem', color: 'var(--primary-color)' }}>Component Details</h3>
          <div className="form-grid">
            <div>
              <label>Core Component</label>
              <select name="coreComponent" value={formData.coreComponent} onChange={handleInputChange}>
                <option value="">Select Core Component...</option>
                <option value="OFSAA Infrastructure & Framework Components">OFSAA Infrastructure & Framework Components</option>
                <option value="Risk Management Applications">Risk Management Applications</option>
                <option value="Finance & Regulatory Reporting">Finance & Regulatory Reporting</option>
              </select>
            </div>
            <div>
              <label>Sub Application</label>
              <input name="subApplication" value={formData.subApplication} onChange={handleInputChange} />
            </div>
            <div>
              <label>Version Details</label>
              <input name="versionDetails" value={formData.versionDetails} onChange={handleInputChange} />
            </div>
            <div>
              <label>vCPU</label>
              <input name="vcpu" value={formData.vcpu} onChange={handleInputChange} />
            </div>
            <div>
              <label>RAM</label>
              <input name="ram" value={formData.ram} onChange={handleInputChange} />
            </div>
            <div>
              <label>Storage</label>
              <input name="storage" value={formData.storage} onChange={handleInputChange} />
            </div>

            <div className="full-width">
              {/* Notes moved upwards */}
            </div>
          </div>

          <div className="action-bar">
            <button type="submit" className="btn-primary">
              Save Record
            </button>
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Reset
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}

export default App;
