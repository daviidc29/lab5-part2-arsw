/*
 * Thread-safe in-memory persistence for Blueprints.
 */
package edu.eci.arsw.blueprints.persistence.impl;

import edu.eci.arsw.blueprints.model.Blueprint;
import edu.eci.arsw.blueprints.model.Point;
import edu.eci.arsw.blueprints.persistence.BlueprintNotFoundException;
import edu.eci.arsw.blueprints.persistence.BlueprintPersistenceException;
import edu.eci.arsw.blueprints.persistence.BlueprintsPersistence;
import java.util.Map;
import java.util.Set;
import java.util.HashSet;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Repository;

@Repository
public class InMemoryBlueprintPersistence implements BlueprintsPersistence {

    private final Map<Tuple<String,String>, Blueprint> blueprints = new ConcurrentHashMap<>();

    public InMemoryBlueprintPersistence() {
        Point[] pts = new Point[]{new Point(140, 140), new Point(115, 115)};
        Blueprint bp = new Blueprint("_authorname_", "_bpname_ ", pts);
        blueprints.put(new Tuple<>(bp.getAuthor(), bp.getName()), bp);

        Point[] pts2 = new Point[]{new Point(0, 0), new Point(10, 10), new Point(20, 20)};
        Blueprint bp2 = new Blueprint("Andres", "garden", pts2);
        blueprints.put(new Tuple<>(bp2.getAuthor(), bp2.getName()), bp2);

        Point[] pts3 = new Point[]{new Point(5, 5), new Point(15, 15)};
        Blueprint bp3 = new Blueprint("Juan", "house", pts3);
        blueprints.put(new Tuple<>(bp3.getAuthor(), bp3.getName()), bp3);

        Point[] pts4 = new Point[]{new Point(0, 0), new Point(5, 5), new Point(10, 10)};
        Blueprint bp4 = new Blueprint("Juan", "office", pts4);
        blueprints.put(new Tuple<>(bp4.getAuthor(), bp4.getName()), bp4);
        
        Point[] ptsJohnConnorHouse = new Point[]{new Point(150, 250), new Point(250, 250), new Point(250, 150), new Point(200, 100), new Point(150, 150), new Point(150, 250)};
        Blueprint bpJohnConnorHouse = new Blueprint("johnconnor", "house", ptsJohnConnorHouse);
        blueprints.put(new Tuple<>(bpJohnConnorHouse.getAuthor(), bpJohnConnorHouse.getName()), bpJohnConnorHouse);

        Point[] ptsJohnConnorGear = new Point[]{new Point(300,200),new Point(310,190),new Point(320,200),new Point(340,200),new Point(350,190),new Point(360,200),new Point(380,220),new Point(390,230),new Point(380,240),new Point(380,260),new Point(390,270),new Point(380,280),new Point(360,300),new Point(350,310),new Point(340,300),new Point(320,300),new Point(310,310),new Point(300,300),new Point(280,280),new Point(270,270),new Point(280,260),new Point(280,240),new Point(270,230),new Point(280,220),new Point(300,200)};
        Blueprint bpJohnConnorGear = new Blueprint("johnconnor", "gear", ptsJohnConnorGear);
        blueprints.put(new Tuple<>(bpJohnConnorGear.getAuthor(), bpJohnConnorGear.getName()), bpJohnConnorGear);


        
        Point[] ptsMaryHouse = new Point[]{new Point(100, 200), new Point(200, 200), new Point(200, 100), new Point(150, 70), new Point(100, 100), new Point(100, 200)};
        Blueprint bpMaryHouse = new Blueprint("maryweyland", "house2", ptsMaryHouse);
        blueprints.put(new Tuple<>(bpMaryHouse.getAuthor(), bpMaryHouse.getName()), bpMaryHouse);

        Point[] ptsMaryLabyrinth = new Point[]{new Point(60,60),new Point(220,60),new Point(220,260),new Point(60,260),new Point(60,60),new Point(80,80),new Point(80,240),new Point(200,240),new Point(200,80),new Point(80,80),new Point(100,100),new Point(180,100),new Point(180,220),new Point(100,220),new Point(100,100),new Point(120,120),new Point(120,200),new Point(160,200),new Point(160,120),new Point(120,120)};
        Blueprint bpMaryLabyrinth = new Blueprint("maryweyland", "labyrinth", ptsMaryLabyrinth);
        blueprints.put(new Tuple<>(bpMaryLabyrinth.getAuthor(), bpMaryLabyrinth.getName()), bpMaryLabyrinth);
    }


    @Override
    public void saveBlueprint(Blueprint bp) throws BlueprintPersistenceException {
        Tuple<String,String> key = new Tuple<>(bp.getAuthor(), bp.getName());
        Blueprint prev = blueprints.putIfAbsent(key, copyOf(bp));
        if (prev != null) {
            throw new BlueprintPersistenceException("The given blueprint already exists: " + bp);
        }
    }

    @Override
    public Blueprint getBlueprint(String author, String bprintname) throws BlueprintNotFoundException {
        Blueprint bp = blueprints.get(new Tuple<>(author, bprintname));
        if (bp == null) throw new BlueprintNotFoundException("Blueprint not found: " + author + "/" + bprintname);
        return copyOf(bp);
    }

    @Override
    public Set<Blueprint> getBlueprintsByAuthor(String author) {
        Set<Blueprint> result = new HashSet<>();
        for (Blueprint bp : blueprints.values()) {
            if (bp.getAuthor().equals(author)) {
                result.add(copyOf(bp));
            }
        }
        return result;
    }

    @Override
    public Set<Blueprint> getAllBlueprints() {
        Set<Blueprint> out = new HashSet<>();
        for (Blueprint bp : blueprints.values()) {
            out.add(copyOf(bp));
        }
        return out;
    }

    @Override
    public void updateBlueprint(String author, String name, Blueprint updated) throws BlueprintNotFoundException {
        Tuple<String,String> key = new Tuple<>(author, name);
        Blueprint replaced = blueprints.computeIfPresent(key, (k, v) -> copyOf(updated));
        if (replaced == null) {
            throw new BlueprintNotFoundException("Blueprint not found: " + author + "/" + name);
        }
    }


    /** Deep copy of a Blueprint to avoid exposing internal mutable state */
    private Blueprint copyOf(Blueprint src) {
        List<Point> pts = src.getPoints();
        Point[] arr = new Point[pts.size()];
        for (int i = 0; i < pts.size(); i++) {
            Point p = pts.get(i);
            arr[i] = new Point(p.getX(), p.getY());
        }
        return new Blueprint(src.getAuthor(), src.getName(), arr);
    }
    @Override
    public void deleteBlueprint(String author, String name) throws BlueprintNotFoundException {
        Tuple<String,String> key = new Tuple<>(author, name);
        Blueprint removed = blueprints.remove(key);
        if (removed == null) {
            throw new BlueprintNotFoundException("Blueprint not found: " + author + "/" + name);
        }
    }
}