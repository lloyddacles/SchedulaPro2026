import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api';

const TermContext = createContext();

export const TermProvider = ({ children }) => {
  const [terms, setTerms] = useState([]);
  const [activeTermId, setActiveTermId] = useState(null);

  // Fetch all terms and identify the one that is currently active if no override is set
  useEffect(() => {
    api.get('/terms').then((res) => {
      setTerms(res.data);
      if (res.data.length > 0) {
        // Find the natively active term, or default to the first one safely
        const defaultTerm = res.data.find(t => t.is_active) || res.data[0];
        setActiveTermId(defaultTerm.id);
      }
    }).catch(console.error);
  }, []);

  const changeTerm = (id) => {
    setActiveTermId(parseInt(id));
  };

  const createTerm = async (name, is_active) => {
     const { data } = await api.post('/terms', { name, is_active });
     setTerms([{...data}, ...terms]);
     if (is_active) {
       setActiveTermId(data.id);
     }
  };

  return (
    <TermContext.Provider value={{ terms, activeTermId, changeTerm, createTerm }}>
      {children}
    </TermContext.Provider>
  );
};

export const useTerm = () => useContext(TermContext);
