'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

type Status = 'não-analisado' | 'em-analise' | 'aceite' | 'recusado';

export default function TicketPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { class1: string; class2: string };
}) {
  const [status, setStatus] = useState<Status>('não-analisado');
  const router = useRouter();

  const statusConfig = {
    'não-analisado': { label: 'Não Analisado', color: 'bg-gray-600' },
    'em-analise': { label: 'Em Análise', color: 'bg-blue-600' },
    'aceite': { label: 'Aceite', color: 'bg-green-600' },
    'recusado': { label: 'Recusado', color: 'bg-red-600' },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 }
    }
  };

  const statusButtonVariants = {
    inactive: { scale: 1, backgroundColor: '#374151' },
    active: { 
      scale: 1.05, 
      transition: { type: 'spring', stiffness: 400, damping: 15 } 
    }
  };

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-6 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-5xl rounded-2xl bg-gradient-to-br from-blue-600/30 via-blue-700/30 to-blue-900/30 p-[2px]"
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="bg-gray-900 rounded-2xl p-6 sm:p-8"
        >

          <motion.header variants={itemVariants} className="text-center mb-10 sm:mb-12 pt-4 sm:pt-6">
            <motion.h1 
              whileHover={{ scale: 1.02 }}
              className="text-3xl sm:text-4xl font-bold text-white mb-3 sm:mb-4"
            >
              Detalhes do Pedido
            </motion.h1>
            <motion.p 
              whileHover={{ scale: 1.01 }}
              className="text-gray-400 max-w-2xl mx-auto text-sm sm:text-base"
            >
              Visualize e acompanhe o status da sua solicitação de troca de turmas
            </motion.p>
          </motion.header>

          <motion.div 
            variants={itemVariants}
            className="bg-gray-800 rounded-xl p-4 sm:p-6 mb-8 shadow-lg border border-gray-700"
          >
            <motion.h2 
              whileTap={{ scale: 0.98 }}
              className="text-xl sm:text-2xl font-bold text-center text-white mb-6"
            >
              Status do Pedido
            </motion.h2>
            <motion.div 
              variants={containerVariants}
              className="flex flex-wrap justify-center gap-3"
            >
              {(Object.keys(statusConfig) as Status[]).map((s) => (
                <motion.button
                  key={s}
                  onClick={() => setStatus(s)}
                  variants={statusButtonVariants}
                  animate={status === s ? "active" : "inactive"}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className={`px-5 py-2.5 rounded-lg ${
                    status === s
                      ? `${statusConfig[s].color} text-white shadow-lg`
                      : 'bg-gray-700 text-gray-400'
                  } font-medium text-sm uppercase tracking-wider`}
                >
                  {statusConfig[s].label}
                </motion.button>
              ))}
            </motion.div>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            className="bg-gray-800 rounded-xl p-6 sm:p-8 shadow-lg border border-gray-700"
          >
            <motion.h2 
              whileHover={{ scale: 1.01 }}
              className="text-xl sm:text-2xl font-bold text-center text-white mb-8"
            >
              Troca de Turmas
            </motion.h2>
            
            <motion.div 
              variants={containerVariants}
              className="flex flex-col items-center space-y-8"
            >
              <motion.div 
                whileHover={{ y: -5 }}
                className="w-full max-w-md bg-gray-700 rounded-lg p-6"
              >
                <motion.div 
                  className="flex justify-center items-center gap-4 flex-wrap"
                  variants={containerVariants}
                >
                  <motion.div 
                    variants={itemVariants}
                    className="text-center"
                    whileHover={{ scale: 1.05 }}
                  >
                    <p className="text-gray-400 text-sm mb-1">Turma Atual</p>
                    <motion.p 
                      className="text-white font-medium text-lg bg-gray-800 px-6 py-3 rounded-lg"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {searchParams.class1}
                    </motion.p>
                  </motion.div>
                  
                  <motion.div 
                    variants={itemVariants}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-blue-400 text-2xl mt-5"
                  >
                    →
                  </motion.div>
                  
                  <motion.div 
                    variants={itemVariants}
                    className="text-center"
                    whileHover={{ scale: 1.05 }}
                  >
                    <p className="text-gray-400 text-sm mb-1">Turma Desejada</p>
                    <motion.p 
                      className="text-white font-medium text-lg bg-gray-800 px-6 py-3 rounded-lg"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {searchParams.class2}
                    </motion.p>
                  </motion.div>
                </motion.div>
              </motion.div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={status}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="inline-flex items-center gap-2 bg-gray-700 px-6 py-3 rounded-lg"
                >
                  <motion.span 
                    className={`w-3 h-3 rounded-full ${statusConfig[status].color}`}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.5, repeat: 1 }}
                  />
                  <span className="font-medium uppercase tracking-wider text-sm sm:text-base">
                    Status Atual: {statusConfig[status].label}
                  </span>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            className="mt-8 text-center"
          >
            <motion.button
              onClick={() => router.back()}
              whileHover={{ scale: 1.03, backgroundColor: '#1E40AF' }}
              whileTap={{ scale: 0.98 }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg transition-all"
            >
              Voltar aos Pedidos
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}