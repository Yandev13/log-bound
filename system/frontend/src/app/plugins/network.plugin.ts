// Layer 1: wrapper of @capacitor/network (frontend rule 5; FR-SYNC-02, FR-SYNC-04, FR-SYNC-08).
import { Injectable, InjectionToken } from '@angular/core';
import { Network } from '@capacitor/network';

export interface NetworkPort {
  /** True if the device has a network connection. It does not tell if the server answers. */
  isOnline(): Promise<boolean>;
  /** Calls `listener` at each change. Gives a function that stops the listener. */
  onChange(listener: (online: boolean) => void): Promise<() => void>;
}

@Injectable({ providedIn: 'root' })
export class CapacitorNetwork implements NetworkPort {
  async isOnline(): Promise<boolean> {
    return (await Network.getStatus()).connected;
  }

  async onChange(listener: (online: boolean) => void): Promise<() => void> {
    const handle = await Network.addListener('networkStatusChange', (status) => listener(status.connected));
    return () => void handle.remove();
  }
}

export const NETWORK = new InjectionToken<NetworkPort>('NETWORK', {
  providedIn: 'root',
  factory: () => new CapacitorNetwork(),
});
