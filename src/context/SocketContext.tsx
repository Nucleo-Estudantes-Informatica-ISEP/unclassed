"use client";

import { sockets } from '@/config/socket';
import React, { createContext, useContext, useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

type SocketContextType = Socket | undefined;

const SocketContext = createContext<SocketContextType>(undefined);

export const useSocket = (): SocketContextType => {
    return useContext(SocketContext);
};

interface SocketProviderProps {
    children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
    const [socket, setSocket] = useState<SocketContextType>(undefined);

    useEffect(() => {
        const newSocket = io(sockets.url);
        setSocket(newSocket);

        console.log('Socket connected');

        return () => { newSocket.close(); }
    }, [sockets.url]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
