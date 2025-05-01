'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function TicketsPage() {
  const router = useRouter();
  const [class1, setClass1] = useState('');
  const [class2, setClass2] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!class1.trim() || !class2.trim()) return;

    const id = Date.now().toString();
    router.push(`/tickets/${id}?class1=${encodeURIComponent(class1)}&class2=${encodeURIComponent(class2)}`);
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 10
      }
    }
  };

  const hoverEffect = {
    hover: {
      y: -3,
      transition: { 
        type: "spring",
        stiffness: 400,
        damping: 10
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-transparent p-4 sm:p-6 flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, type: "spring" }}
        className="w-full max-w-5xl rounded-2xl bg-gradient-to-br from-blue-600/30 via-blue-700/30 to-blue-900/30 p-[2px]"
      >
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="bg-gray-900 rounded-2xl p-6 sm:p-8"
        >
          <motion.header variants={item} className="text-center mb-10 sm:mb-12 pt-4 sm:pt-6">
            <motion.h1 
              whileHover={{ scale: 1.02 }}
              className="text-3xl sm:text-4xl font-bold text-white mb-3 sm:mb-4"
            >
              Sistema de Troca de Turmas
            </motion.h1>
            <motion.p 
              whileHover={{ scale: 1.01 }}
              className="text-gray-400 max-w-2xl mx-auto text-sm sm:text-base"
            >
              Solicite a troca entre turmas de forma rápida e acompanhe o status do seu pedido
            </motion.p>
          </motion.header>

          <motion.div
            variants={item}
            whileHover="hover"
            className="bg-gray-800 rounded-xl p-6 sm:p-8 shadow-lg border border-gray-700"
          >
            <motion.h2 
              whileTap={{ scale: 0.98 }}
              className="text-xl sm:text-2xl font-bold text-center text-white mb-6"
            >
              Criar Novo Pedido
            </motion.h2>
            
            <motion.form 
              onSubmit={handleSubmit} 
              className="space-y-6"
              variants={container}
            >
              <motion.div 
                variants={container}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6"
              >
                <motion.div variants={item}>
                  <label htmlFor="current-class" className="block text-sm font-medium text-gray-400 mb-2">
                    Turma Atual
                  </label>
                  <motion.input
                    id="current-class"
                    type="text"
                    value={class1}
                    onChange={(e) => setClass1(e.target.value)}
                    placeholder="Ex: 1DA"
                    className="w-full p-3 sm:p-4 rounded-lg bg-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                    whileFocus={{ 
                      scale: 1.02,
                      boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.5)"
                    }}
                  />
                </motion.div>
                <motion.div variants={item}>
                  <label htmlFor="new-class" className="block text-sm font-medium text-gray-400 mb-2">
                    Turma Desejada
                  </label>
                  <motion.input
                    id="new-class"
                    type="text"
                    value={class2}
                    onChange={(e) => setClass2(e.target.value)}
                    placeholder="Ex: 1DJ"
                    className="w-full p-3 sm:p-4 rounded-lg bg-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                    whileFocus={{ 
                      scale: 1.02,
                      boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.5)"
                    }}
                  />
                </motion.div>
              </motion.div>

              <motion.div variants={item} className="pt-2">
                <motion.button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-3 sm:py-4 px-6 rounded-lg shadow-lg relative overflow-hidden"
                  whileHover={{ 
                    background: [
                      'linear-gradient(to right, #2563eb, #1d4ed8)',
                      'linear-gradient(to right, #1d4ed8, #1e40af)',
                      'linear-gradient(to right, #2563eb, #1d4ed8)'
                    ],
                    transition: { duration: 1.5, repeat: Infinity }
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="relative z-10">Submeter Pedido</span>
                  <motion.span
                    className="absolute inset-0 bg-blue-500 opacity-0"
                    animate={{
                      opacity: [0, 0.3, 0],
                      x: ['-100%', '100%']
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </motion.button>
              </motion.div>
            </motion.form>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}