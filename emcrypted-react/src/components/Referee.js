import { useEffect } from "react";

const Referee = ({ refereeData, setRefereeData }) => {
  useEffect(() => {
    const interval = setInterval(() => {
      setRefereeData((prevData) => ({
        ...prevData,
        time: prevData.time + 1
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [setRefereeData]);

  return null; 
};

export default Referee;



  

  