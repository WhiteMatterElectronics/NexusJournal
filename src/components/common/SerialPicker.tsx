import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Usb, X, Settings2, ShieldAlert } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { cn } from '../../lib/utils';

interface SerialPort {
  portId: string;
  portName: string;
  displayName?: string;
  vendorId?: string;
  productId?: string;
}

export const SerialPicker: React.FC = () => {
  const { theme } = useSettings();
  const isGlassy = theme.globalTheme === 'glassy';
  const [ports, setPorts] = useState<SerialPort[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const electron = (window as any).electron;
    if (!electron?.serial) return;

    const unsubscribe = electron.serial.onShowPicker((availablePorts: SerialPort[]) => {
      // Filter out ttyS* ports on Linux which are usually not the USB ones
      const filteredPorts = availablePorts.filter(port => {
        const name = port.portName.toLowerCase();
        // Typically on Linux, USB serial devices are ttyUSB* or ttyACM*
        // On Mac, they are tty.* or cu.*
        // On Windows, they are COM*
        if (name.includes('ttyS') || name.includes('tty.Bluetooth-') || name.includes('cu.Bluetooth-')) {
            // Keep it if it has a specific vendorId (meaning it's a real device that got mapped weirdly)
            return port.vendorId !== undefined && port.vendorId !== '';
        }
        return true;
      });
      setPorts(filteredPorts);
      setIsVisible(true);
    });

    return () => unsubscribe();
  }, []);

  const handleSelect = (portId: string) => {
    const electron = (window as any).electron;
    if (electron?.serial) {
      electron.serial.selectPort(portId);
    }
    setIsVisible(false);
  };

  const handleCancel = () => {
    const electron = (window as any).electron;
    if (electron?.serial) {
      electron.serial.selectPort(''); // Send empty string to cancel
    }
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-sans text-hw-blue">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              "w-full max-w-md overflow-hidden border flex flex-col shadow-2xl",
              isGlassy ? "rounded-2xl bg-black/80 border-white/20" : "rounded-sm bg-hw-black border-hw-blue"
            )}
            style={{ backdropFilter: 'var(--theme-backdrop-filter)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-hw-blue/20 bg-hw-blue/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-hw-blue/10 border border-hw-blue/30">
                  <Usb className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest">Select Serial Port</h2>
                  <p className="text-[10px] uppercase tracking-wider text-hw-blue/60">Hardware Connection Request</p>
                </div>
              </div>
              <button 
                onClick={handleCancel}
                className="p-2 hover:bg-red-500/10 text-hw-blue/40 hover:text-red-500 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col gap-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {ports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center opacity-60">
                  <ShieldAlert className="w-8 h-8 mb-3" />
                  <p className="text-xs uppercase tracking-widest font-bold">No Devices Found</p>
                  <p className="text-[10px] mt-1">Please connect a device and try again.</p>
                </div>
              ) : (
                ports.map((port, index) => (
                  <button
                    key={port.portId || index}
                    onClick={() => handleSelect(port.portId)}
                    className="flex items-center gap-4 p-3 rounded hover:bg-hw-blue/10 border border-transparent hover:border-hw-blue/30 transition-all text-left group"
                  >
                    <div className="p-2 rounded bg-hw-blue/5 group-hover:bg-hw-blue/20">
                      <Settings2 className="w-4 h-4 text-hw-blue/60 group-hover:text-hw-blue" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold uppercase tracking-widest truncate">
                        {port.displayName || port.portName}
                      </div>
                      <div className="text-[10px] text-hw-blue/60 font-mono truncate">
                        {port.portName}
                        {port.vendorId ? ` (VID: ${port.vendorId} PID: ${port.productId})` : ''}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-hw-blue/20 bg-black/40 flex justify-end gap-3">
              <button
                onClick={handleCancel}
                className="px-6 py-2 text-xs font-bold uppercase tracking-widest rounded border border-hw-blue/30 hover:bg-hw-blue/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
