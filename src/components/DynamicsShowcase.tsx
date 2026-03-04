import { motion } from "framer-motion";
import { dynamics } from "@/data/courseData";
import { useNavigate } from "react-router-dom";

const colorMap = {
  coral: "bg-coral-light",
  gold: "bg-gold-light",
  navy: "bg-navy-light",
};

export default function DynamicsShowcase() {
  const navigate = useNavigate();

  const getRoute = (id: string) => {
    if (id === "quiz") return "/quiz";
    if (id === "flashcards") return "/flashcards";
    if (id === "evidence") return "/evidence";
    return "#";
  };

  return (
    <section id="dynamics" className="py-24 bg-muted/30">
      <div className="container">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
            10 Dinâmicas <span className="text-gradient">Gamificadas</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Pipeline pedagógico completo: ensinar + treinar + transferir para a vida e para a organização.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {dynamics.map((d, i) => (
            <motion.div
              key={d.id}
              className={`${colorMap[d.color]} rounded-2xl p-5 cursor-pointer group hover:shadow-warm transition-all duration-300 hover:-translate-y-1`}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              onClick={() => {
                const route = getRoute(d.id);
                if (route !== "#") navigate(route);
              }}
            >
              <div className="text-3xl mb-3">{d.icon}</div>
              <h4 className="font-display font-bold text-sm mb-1">{d.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{d.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
